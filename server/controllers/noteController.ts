import { Request, Response } from "express";
import Note from "../models/Note.js";
import { sendNewNoteNotification } from "../utils/sendNotification.js";

export const getAllNotes = async (req: Request, res: Response) => {
  try {
    const notes = await Note.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "name image");

    res.json({ success: true, count: notes.length, data: notes });
  } catch (error: any) {
    console.error("GET ALL NOTES ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getNoteById = async (req: Request, res: Response) => {
  try {
    const note = await Note.findById(req.params.id).populate("createdBy", "name image");
    if (!note) {
      return res.status(404).json({ success: false, message: "Note introuvable" });
    }
    res.json({ success: true, data: note });
  } catch (error: any) {
    console.error("GET NOTE BY ID ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createNote = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user as any;
    const { title, content, type, meetingLink, meetingDate, reminderFrequency } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Le titre est requis" });
    }

    if (type === "meeting" && !meetingDate) {
      return res.status(400).json({
        success: false,
        message: "La date de la réunion est requise",
      });
    }

    const note = await Note.create({
      title: title.trim(),
      content: content?.trim() || "",
      type: type === "meeting" ? "meeting" : "note",
      createdBy: currentUser._id,
      meetingLink: type === "meeting" ? meetingLink || null : null,
      meetingDate: type === "meeting" ? new Date(meetingDate) : null,
      reminderFrequency: type === "meeting" ? reminderFrequency || "none" : "none",
    });

    const populated = await note.populate("createdBy", "name image");

    await sendNewNoteNotification(
      note.title,
      note._id.toString(),
      note.type,
      currentUser.name || "Un admin",
      currentUser._id.toString()
    );

    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    console.error("CREATE NOTE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateNote = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user as any;
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ success: false, message: "Note introuvable" });
    }

    const isOwner = note.createdBy.toString() === currentUser._id.toString();
    const isMainAdmin =
      currentUser.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();

    if (!isOwner && !isMainAdmin) {
      return res.status(403).json({
        success: false,
        message: "Seul le créateur peut modifier cette note",
      });
    }

    const { title, content, type, meetingLink, meetingDate, reminderFrequency } = req.body;

    if (title !== undefined) note.title = title.trim();
    if (content !== undefined) note.content = content.trim();
    if (type !== undefined) note.type = type;

    if (note.type === "meeting") {
      if (meetingLink !== undefined) note.meetingLink = meetingLink;
      if (meetingDate !== undefined) {
        note.meetingDate = new Date(meetingDate);
        note.lastReminderSentAt = null;
      }
      if (reminderFrequency !== undefined) note.reminderFrequency = reminderFrequency;
    } else {
      note.meetingLink = null;
      note.meetingDate = null;
      note.reminderFrequency = "none";
    }

    await note.save();
    const populated = await note.populate("createdBy", "name image");

    res.json({ success: true, data: populated });
  } catch (error: any) {
    console.error("UPDATE NOTE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNote = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user as any;
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ success: false, message: "Note introuvable" });
    }

    const isOwner = note.createdBy.toString() === currentUser._id.toString();
    const isMainAdmin =
      currentUser.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();

    if (!isOwner && !isMainAdmin) {
      return res.status(403).json({
        success: false,
        message: "Seul le créateur peut supprimer cette note",
      });
    }

    await note.deleteOne();
    res.json({ success: true, message: "Note supprimée" });
  } catch (error: any) {
    console.error("DELETE NOTE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};