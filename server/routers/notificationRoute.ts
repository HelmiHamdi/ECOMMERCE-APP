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

NotificationRouter.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

NotificationRouter.get("/", protect, getMyNotifications);
NotificationRouter.put("/read-all", protect, markAllNotificationsRead);
NotificationRouter.put("/:id/read", protect, markNotificationRead);
NotificationRouter.delete("/clear-all", protect, clearAllNotifications); 
NotificationRouter.delete("/:id", protect, deleteNotification);

export default NotificationRouter;