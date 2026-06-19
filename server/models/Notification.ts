import mongoose, { Schema } from "mongoose";
import { INotification } from "../types/index.js";



const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ["new_product", "daily_reminder", "order", "general"],
      default: "general",
    },
    data: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Pour charger rapidement "mes notifications, les plus récentes d'abord"
notificationSchema.index({ user: 1, createdAt: -1 });

const Notification = mongoose.model<INotification>("Notification", notificationSchema);

export default Notification;