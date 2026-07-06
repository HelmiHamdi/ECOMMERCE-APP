import express from "express";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/auth.js";

const NotificationRouter = express.Router();

NotificationRouter.get("/", protect, getMyNotifications);
NotificationRouter.put("/read-all", protect, markAllNotificationsRead);
NotificationRouter.put("/:id/read", protect, markNotificationRead);
NotificationRouter.delete("/clear-all", protect, clearAllNotifications); // doit être AVANT
NotificationRouter.delete("/:id", protect, deleteNotification);

export default NotificationRouter;