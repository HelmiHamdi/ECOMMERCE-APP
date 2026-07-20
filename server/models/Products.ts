import mongoose, { Schema } from "mongoose";
import { IProduct } from "../types/index.js";



const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    images: [{ type: String }],
    sizes: { type: [String], default: [] }, 
    video: { type: String },
    category: {
      type: String,
      enum: ["men", "women", "kids", "shoes", "bag", "makeup", "accessories", "baby","parfum", "other"],
      required: true,
      set: (v: string) => v?.toLowerCase(),
    },
    status: {
      type: String,
      enum: ["in_stock", "incoming", "out_of_stock", "on_order_48h"],
      default: "in_stock",
    },
    stock: { type: Number, required: true, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", description: "text" });

const Product = mongoose.model<IProduct>("Product", productSchema);

export default Product;