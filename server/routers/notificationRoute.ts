import express from "express";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/auth.js";

const NotificationRouter = express.Router();

NotificationRouter.get("/", protect, getMyNotifications);
NotificationRouter.put("/read-all", protect, markAllNotificationsRead);
NotificationRouter.put("/:id/read", protect, markNotificationRead);

export default NotificationRouter;