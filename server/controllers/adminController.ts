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