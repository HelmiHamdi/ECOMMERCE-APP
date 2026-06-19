import { Request, Response } from "express";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

// GET /api/notifications  → liste paginée des notifications de l'utilisateur connecté
export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const { userId } = await req.auth();
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { page = 1, limit = 20 } = req.query;

    const total = await Notification.countDocuments({ user: user._id });
    const unreadCount = await Notification.countDocuments({
      user: user._id,
      isRead: false,
    });

    const notifications = await Notification.find({ user: user._id })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/notifications/:id/read  → marquer une notification comme lue
export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const { userId } = await req.auth();
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, data: notification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/notifications/read-all  → tout marquer comme lu
export const markAllNotificationsRead = async (req: Request, res: Response) => {
  try {
    const { userId } = await req.auth();
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await Notification.updateMany(
      { user: user._id, isRead: false },
      { isRead: true }
    );

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};