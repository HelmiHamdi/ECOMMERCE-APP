import mongoose, { Schema } from "mongoose";

export interface IDevis extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  product?: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  quantity: number;
  size?: string;
  message: string;
  status: "pending" | "in_progress" | "answered" | "rejected" | "closed";
  adminResponse?: string;
  isReadByAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const devisSchema = new Schema<IDevis>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    quantity: { type: Number, default: 1, min: 1 },
    size: { type: String },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "in_progress", "answered", "rejected", "closed"],
      default: "pending",
    },
    adminResponse: { type: String },
    isReadByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true },
);

devisSchema.index({ status: 1, createdAt: -1 });

const Devis = mongoose.model<IDevis>("Devis", devisSchema);

export default Devis;