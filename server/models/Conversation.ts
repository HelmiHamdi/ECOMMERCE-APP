import mongoose, { Document, Types } from "mongoose";
import { IConversation } from "../types/index.js";



const conversationSchema = new mongoose.Schema<IConversation>(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    isGroup: { type: Boolean, default: false },
    name: { type: String, trim: true },
    lastMessage: { type: String, default: "" },
    lastMessageType: {
      type: String,
      enum: ["text", "image", "video", "file", "audio", "call"],
      default: "text",
    },
    lastMessageAt: { type: Date },
    lastMessageSender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

const Conversation = mongoose.model<IConversation>(
  "Conversation",
  conversationSchema
);

export default Conversation;