import mongoose, { Schema } from "mongoose";
import { IGif } from "../types/index.js";

const gifSchema = new Schema<IGif>(
  {
    title: { type: String, trim: true },
    image: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

gifSchema.index({ isActive: 1 });

const Gif = mongoose.model<IGif>("Gif", gifSchema);

export default Gif;