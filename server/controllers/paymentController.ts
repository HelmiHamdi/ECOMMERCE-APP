
import stripe from "../config/stripe.js";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import { Request, Response } from "express";
import { invalidateCache } from "../middleware/cache.js";
import Stripe from "stripe";



export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.product")
      .lean();

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const shippingCost = 2;
    const totalAmount = Math.round((cart.totalAmount + shippingCost) * 100); // en centimes

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: "usd", // ou "eur"
      metadata: {
        userId: req.user._id.toString(),
        cartId: (cart as any)._id.toString(),
      },
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Webhook Stripe (confirmer le paiement côté serveur) ─────────────────────
export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"]!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // raw body obligatoire
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;

    // Mettre à jour le statut de paiement de la commande
    await Order.findOneAndUpdate(
      { paymentIntentId: intent.id },
      { paymentStatus: "paid", orderStatus: "processing" }
    );
    invalidateCache("orders");
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    await Order.findOneAndUpdate(
      { paymentIntentId: intent.id },
      { paymentStatus: "failed" }
    );
  }

  res.json({ received: true });
};