import mongoose from "mongoose";
import { IOrder } from "../types/index.js";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: false, // 👈 CORRECTION — optionnel : une offre libre n'a pas de produit
    default: null,
  },
  name: { type: String, required: true },
  image: { type: String, default: null },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  size: { type: String },

  // 👇 AJOUT — traçabilité de l'offre appliquée à cet item de commande
  offerId: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", default: null },
  offerTitle: { type: String, default: null },
});

const orderSchema = new mongoose.Schema<IOrder>({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderNumber: { type: String, unique: true },
  items: [orderItemSchema],
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ["cash", "stripe"],
    default: "cash",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending",
  },
  paymentIntentId: { type: String },
  orderStatus: {
    type: String,
    enum: ["placed", "processing", "shipped", "delivered", "cancelled"],
    default: "placed",
  },
  subtotal: { type: Number, required: true },
  shippingCost: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  notes: String,
  deliveredAt: Date,
}, { timestamps: true });

const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;