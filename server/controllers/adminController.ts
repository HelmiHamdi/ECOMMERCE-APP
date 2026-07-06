import { Request, Response } from "express";
import User from "../models/User.js";
import Product from "../models/Products.js";
import Order from "../models/Order.js";


export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Une seule requête MongoDB au lieu de 4
    const [totalUsers, totalProducts, totalOrders, revenueResult, recentOrders] = 
      await Promise.all([
        User.countDocuments(),
        Product.countDocuments(),
        Order.countDocuments(),
        // Calcul du revenu DANS MongoDB, pas en JS
        Order.aggregate([
          { $match: { orderStatus: { $ne: "cancelled" } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        Order.find()
          .sort("-createdAt")
          .limit(5)
          .populate("user", "name email")
          .lean(),
      ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: revenueResult[0]?.total || 0,
        recentOrders,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    // req.user est peuplé par ton middleware "protect" (voir getMyProfile)
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
 
    const { search, role } = req.query as { search?: string; role?: string };
 
    const filter: any = {};
    if (role && role !== "all") {
      filter.role = role;
    }
    if (search) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }
 
    const users = await User.find(filter).sort({ createdAt: -1 });
 
    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error: any) {
    console.error("GET ALL USERS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};