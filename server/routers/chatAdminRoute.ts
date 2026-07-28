import express, { Request, Response, NextFunction } from "express";
import { protect, authorize } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import {
  getMe,
  getMyConversations,
  getConversationById,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  getAvailableAdmins,
} from "../controllers/chatAdminController.js";

const ChatAdminRouter = express.Router();


ChatAdminRouter.use(protect, authorize("admin"));

const uploadSingleFile = (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, (err: any) => {
    if (err) {
      console.error("UPLOAD MIDDLEWARE ERROR:", err.message);
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

ChatAdminRouter.get("/me", getMe);
ChatAdminRouter.get("/admins", getAvailableAdmins);
ChatAdminRouter.get("/conversations", getMyConversations);
ChatAdminRouter.post("/conversations", getOrCreateConversation);
ChatAdminRouter.get("/conversations/:id", getConversationById);
ChatAdminRouter.get("/conversations/:id/messages", getMessages);
ChatAdminRouter.post("/conversations/:id/messages", uploadSingleFile, sendMessage);
ChatAdminRouter.patch("/messages/:messageId", editMessage);
ChatAdminRouter.delete("/messages/:messageId", deleteMessage);

export default ChatAdminRouter;