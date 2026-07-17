import mongoose, { Schema } from "mongoose";
import { ISupportTicket } from "../types/index.js";



const supportTicketSchema = new Schema<ISupportTicket>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },


    category: {
      type: String,
      enum: ["order", "return", "defective", "delivery", "payment", "other"],
      default: "other",
    },


    orderNumber: { type: String, trim: true },

   
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "closed"],
      default: "open",
    },
    reply: { type: String },
  },
  { timestamps: true }
);

const SupportTicket = mongoose.model<ISupportTicket>(
  "SupportTicket",
  supportTicketSchema
);

export default SupportTicket;