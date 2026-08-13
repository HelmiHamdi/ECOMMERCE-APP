import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
} from "../controllers/noteController.js";

const NoteRouter = express.Router();

NoteRouter.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

NoteRouter.get("/", protect, authorize("admin"), getAllNotes);
NoteRouter.post("/", protect, authorize("admin"), createNote);
NoteRouter.get("/:id", protect, authorize("admin"), getNoteById);
NoteRouter.put("/:id", protect, authorize("admin"), updateNote);
NoteRouter.delete("/:id", protect, authorize("admin"), deleteNote);

export default NoteRouter;