import mongoose, { Schema } from "mongoose";
import { IProduct } from "../types/index.js";

const SIZE_REQUIRED_CATEGORIES = ["men", "women", "kids", "shoes"]; // 👈 AJOUT

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    images: [{ type: String }],
    sizes: { type: [String], default: [] }, // 👈 plus de validator ici, on le fait dans le controller uniquement
    video: { type: String },
    category: {
      type: String,
      enum: ["men", "women", "kids", "shoes", "bag", "makeup", "accessories", "baby", "other"],
      required: true,
      set: (v: string) => v?.toLowerCase(),
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