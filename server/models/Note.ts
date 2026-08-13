import mongoose, { Schema, } from "mongoose";
import { INote } from "../types/index.js";



const noteSchema = new Schema<INote>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "", trim: true },
    type: { type: String, enum: ["note", "meeting"], default: "note" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    meetingLink: { type: String, default: null, trim: true },
    meetingDate: { type: Date, default: null },
    reminderFrequency: { type: String, enum: ["none", "daily", "hourly"], default: "none" },
    lastReminderSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

noteSchema.index({ createdAt: -1 });
noteSchema.index({ type: 1, meetingDate: 1 });

const Note = mongoose.model<INote>("Note", noteSchema);
export default Note;