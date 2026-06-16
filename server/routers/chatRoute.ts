import express from "express";
import { optionalAuth } from "../middleware/auth.js";
import { sendChatMessage, searchProductsForChat } from "../controllers/chatController.js";

const ChatRouter = express.Router();

ChatRouter.post("/", optionalAuth, sendChatMessage);
ChatRouter.get("/products", searchProductsForChat);

export default ChatRouter;