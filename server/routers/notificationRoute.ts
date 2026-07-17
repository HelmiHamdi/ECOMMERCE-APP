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

// Empêche tout cache (OS mobile, proxy réseau, CDN) sur les routes notifications.
// Sans ça, un GET /notifications répété peut renvoyer une réponse mise en
// cache au lieu de l'état réel après un delete/clear-all/mark-read.
NotificationRouter.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

NotificationRouter.get("/", protect, getMyNotifications);
NotificationRouter.put("/read-all", protect, markAllNotificationsRead);
NotificationRouter.put("/:id/read", protect, markNotificationRead);
NotificationRouter.delete("/clear-all", protect, clearAllNotifications); // doit être AVANT
NotificationRouter.delete("/:id", protect, deleteNotification);

export default NotificationRouter;