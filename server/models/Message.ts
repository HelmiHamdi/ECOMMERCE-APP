import mongoose, { Document, Types } from "mongoose";
import { IMessage } from "../types/index.js";



const messageSchema = new mongoose.Schema<IMessage>(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["text", "image", "video", "file", "audio", "call"],
      default: "text",
    },
    content: { type: String, trim: true },

    fileUrl: { type: String },
    fileName: { type: String },
    fileMimeType: { type: String },
    fileSize: { type: Number },
    thumbnailUrl: { type: String },

    callKind: { type: String, enum: ["audio", "video"] },
    callStatus: {
      type: String,
      enum: ["missed", "answered", "declined", "ended"],
    },
    callDurationSec: { type: Number, default: 0 },

    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

const Message = mongoose.model<IMessage>("Message", messageSchema);

export default Message;