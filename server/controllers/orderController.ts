import { Request, Response } from "express";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Products.js";
import { invalidateCache } from "../middleware/cache.js";
import stripe from "../config/stripe.js";
import { generateInvoicePDF } from "../utils/generateInvoicePDF.js";
import jwt from "jsonwebtoken";

// Langues supportées par la facture PDF — doit correspondre à Language
// dans utils/generateInvoicePDF.ts et au LanguageContext du frontend.
const SUPPORTED_INVOICE_LANGS = ["en", "fr", "ar", "es", "it", "de"];

function resolveLang(value: unknown): string {
  return SUPPORTED_INVOICE_LANGS.includes(value as string) ? (value as string) : "fr";
}

export const getOrderInvoice = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.product", "name images")
      .populate("user", "name email phone")
      .lean();

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    const isOwner = (order.user as any)?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin)
      return res.status(403).json({ success: false, message: "Not authorized" });

    const validCurrencies = ["USD", "EUR", "TND"];
    const currency = validCurrencies.includes(req.query.currency as string)
      ? (req.query.currency as "USD" | "EUR" | "TND")
      : "TND";

    const rate = req.query.rate ? parseFloat(req.query.rate as string) : undefined;
    const lang = resolveLang(req.query.lang);

    await generateInvoicePDF({ ...order, currency, rate, lang } as any, res);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInvoiceLink = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    const isOwner = (order.user as any)?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin)
      return res.status(403).json({ success: false, message: "Not authorized" });

    const tempToken = jwt.sign(
      { orderId: req.params.id, userId: req.user._id.toString() },
      process.env.JWT_SECRET!,
      { expiresIn: "5m" }
    );

    const { currency = "TND", rate } = req.query;
    const lang = resolveLang(req.query.lang);
    const baseURL = process.env.BASE_URL || "https://shop-mobile-server.vercel.app";

    const link = `${baseURL}/api/orders/${req.params.id}/invoice/download?token=${tempToken}&currency=${currency}&rate=${rate}&lang=${lang}`;

    res.json({ success: true, link });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const downloadInvoicePublic = async (req: Request, res: Response) => {
  try {
    const { token, currency, rate, lang } = req.query;

    if (!token)
      return res.status(401).json({ success: false, message: "Token manquant" });

    let decoded: any;
    try {
      decoded = jwt.verify(token as string, process.env.JWT_SECRET!);
    } catch {
      return res.status(401).json({ success: false, message: "Token invalide ou expiré" });
    }

    if (decoded.orderId !== req.params.id)
      return res.status(403).json({ success: false, message: "Token ne correspond pas à cette commande" });

    const order = await Order.findById(req.params.id)
      .populate("items.product", "name images")
      .populate("user", "name email phone")
      .lean();

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    const validCurrencies = ["USD", "EUR", "TND"];
    const cur = validCurrencies.includes(currency as string)
      ? (currency as "USD" | "EUR" | "TND")
      : "TND";
    const r = rate ? parseFloat(rate as string) : undefined;
    const resolvedLang = resolveLang(lang);

    await generateInvoicePDF({ ...order, currency: cur, rate: r, lang: resolvedLang } as any, res);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("items.product", "name images")
      .sort("-createdAt")
      .lean();
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrder = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.product", "name images")
      .lean();

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    if (
      order.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    )
      return res.status(403).json({ success: false, message: "Not authorized" });

    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { shippingAddress, notes, paymentMethod, paymentIntentId } = req.body;

    if (paymentMethod === "stripe") {
      if (!paymentIntentId)
        return res.status(400).json({ success: false, message: "PaymentIntent ID required for card payment" });

      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status !== "succeeded")
        return res.status(400).json({ success: false, message: "Payment not confirmed yet" });
    }

    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.product")
      .lean();

    if (!cart || cart.items.length === 0)
      return res.status(404).json({ success: false, message: "Cart is empty" });

    const productIds = cart.items.map((item: any) => item.product._id);
    const products   = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const orderItems: any[]            = [];
    const stockUpdates: Promise<any>[] = [];

    for (const item of cart.items as any[]) {
      const product = productMap.get(item.product._id.toString());
      if (!product || product.stock < item.quantity)
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.product.name}`,
        });

      orderItems.push({
        product:  item.product._id,
        name:     item.product.name,
        image:    item.product.images?.[0] ?? null,
        quantity: item.quantity,
        price:    item.price,
        size:     item.size,
      });

      stockUpdates.push(
        Product.findByIdAndUpdate(item.product._id, { $inc: { stock: -item.quantity } })
      );
    }

    const subtotal     = cart.totalAmount;
    const shippingCost = 2;
    const totalAmount  = subtotal + shippingCost;

    const [order] = await Promise.all([
      Order.create({
        user:            req.user._id,
        items:           orderItems,
        shippingAddress,
        paymentMethod:   paymentMethod || "cash",
        paymentStatus:   paymentMethod === "stripe" ? "paid" : "pending",
        orderStatus:     paymentMethod === "stripe" ? "processing" : "placed",
        subtotal,
        shippingCost,
        tax:             0,
        totalAmount,
        notes,
        paymentIntentId: paymentIntentId || null,
        orderNumber:     "ORD-" + Date.now(),
      }),
      ...stockUpdates,
    ]);

    await Cart.findByIdAndUpdate((cart as any)._id, { items: [], totalAmount: 0 });

    invalidateCache("orders");
    invalidateCache("cart");
    res.status(201).json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    const updates: any = {};
    if (orderStatus)               updates.orderStatus  = orderStatus;
    if (paymentStatus)             updates.paymentStatus = paymentStatus;
    if (orderStatus === "delivered") updates.deliveredAt = new Date();

    const order = await Order.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    invalidateCache("orders");
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query: any = {};
    if (status) query.orderStatus = status;

    const [total, orders] = await Promise.all([
      Order.countDocuments(query),
      Order.find(query)
        .populate("user", "name email")
        .populate("items.product", "name")
        .sort("-createdAt")
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        page:  Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};