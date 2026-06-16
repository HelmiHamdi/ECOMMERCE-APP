import mongoose from "mongoose";
import { IUser } from "../types/index.js";

const userSchema = new mongoose.Schema<IUser>({
  name: { type: String, trim: true },
  email: { type: String, unique: true, trim: true },
  clerkId: { type: String, unique: true, sparse: true },
  image: { type: String },
  expoPushToken: {
  type: String,
  default: null,
},
  phone: { type: String, trim: true, default: "" },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  wishlist: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
}, {
  timestamps: true,
});

const User = mongoose.model<IUser>("User", userSchema);

export default User;