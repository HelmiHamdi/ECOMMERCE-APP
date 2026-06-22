import { Request, Response } from "express";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Products.js";
import { invalidateCache } from "../middleware/cache.js";
import stripe from "../config/stripe.js";
import { generateInvoicePDF } from "../utils/generateInvoicePDF.js";

const VALID_CURRENCIES = ["USD", "EUR", "TND"] as const;
//type SupportedCurrency = (typeof VALID_CURRENCIES)[number];

export const getOrderInvoice = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.product", "name images")
      .populate("user", "name email phone")
      .lean();
 
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
 
    const isOwner = (order.user as any)?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin)
      return res.status(403).json({ success: false, message: "Not authorized" });
 
    // ✅ Lire currency ET rate depuis le frontend
    const validCurrencies = ["USD", "EUR", "TND"];
    const currency = validCurrencies.includes(req.query.currency as string)
      ? (req.query.currency as "USD" | "EUR" | "TND")
      : "TND";
 
    // rate envoyé par le frontend (ex: 0.32 pour USD, 0.30 pour EUR, 1 pour TND)
    const rate = req.query.rate ? parseFloat(req.query.rate as string) : undefined;
 
    await generateInvoicePDF({ ...order, currency, rate } as any, res);
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

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (
      order.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { shippingAddress, notes, paymentMethod, paymentIntentId } = req.body;

    if (paymentMethod === "stripe") {
      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          message: "PaymentIntent ID required for card payment",
        });
      }
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status !== "succeeded") {
        return res.status(400).json({
          success: false,
          message: "Payment not confirmed yet",
        });
      }
    }

    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.product")
      .lean();

    if (!cart || cart.items.length === 0) {
      return res.status(404).json({ success: false, message: "Cart is empty" });
    }

    const productIds = cart.items.map((item: any) => item.product._id);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const orderItems = [];
    const stockUpdates: Promise<any>[] = [];

    for (const item of cart.items as any[]) {
      const product = productMap.get(item.product._id.toString());
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.product.name}`,
        });
      }
      orderItems.push({
        product: item.product._id,
        name: item.product.name,
        image: item.product.images?.[0] ?? null,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
      });
      stockUpdates.push(
        Product.findByIdAndUpdate(item.product._id, {
          $inc: { stock: -item.quantity },
        })
      );
    }

    const subtotal = cart.totalAmount;
    const shippingCost = 2;
    const totalAmount = subtotal + shippingCost;

    const [order] = await Promise.all([
      Order.create({
        user: req.user._id,
        items: orderItems,
        shippingAddress,
        paymentMethod: paymentMethod || "cash",
        paymentStatus: paymentMethod === "stripe" ? "paid" : "pending",
        orderStatus: paymentMethod === "stripe" ? "processing" : "placed",
        subtotal,
        shippingCost,
        tax: 0,
        totalAmount,
        notes,
        paymentIntentId: paymentIntentId || null,
        orderNumber: "ORD-" + Date.now(),
      }),
      ...stockUpdates,
    ]);

    await Cart.findByIdAndUpdate((cart as any)._id, {
      items: [],
      totalAmount: 0,
    });

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
    if (orderStatus) updates.orderStatus = orderStatus;
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (orderStatus === "delivered") updates.deliveredAt = new Date();

    const order = await Order.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
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
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};