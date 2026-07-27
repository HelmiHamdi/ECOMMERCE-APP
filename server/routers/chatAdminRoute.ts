import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import {
  getMyConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getAvailableAdmins,
} from "../controllers/chatAdminController.js";

const ChatAdminRouter = express.Router();

// Toutes les routes de chat sont réservées aux admins
ChatAdminRouter.use(protect, authorize("admin"));

ChatAdminRouter.get("/admins", getAvailableAdmins);
ChatAdminRouter.get("/conversations", getMyConversations);
ChatAdminRouter.post("/conversations", getOrCreateConversation);
ChatAdminRouter.get("/conversations/:id/messages", getMessages);
ChatAdminRouter.post("/conversations/:id/messages", upload.single("file"), sendMessage);

export default ChatAdminRouter;