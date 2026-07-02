import mongoose, { Schema } from "mongoose";
import { IBanner } from "../types/index.js";


const bannerSchema = new Schema<IBanner>(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    image: { type: String, required: true },
    link: { type: String, default: "/shop" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

bannerSchema.index({ order: 1 });

const Banner = mongoose.model<IBanner>("Banner", bannerSchema);

export default Banner;