import { Request, Response } from "express";
import User from "../models/User.js";
import Product from "../models/Products.js";
import Order from "../models/Order.js";
import { invalidateCache } from "../middleware/cache.js";


export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      revenueResult,
      recentOrders,
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),

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

// ================================================================
// ✅ STATISTIQUES GRAPHIQUES (courbes / diagrammes du dashboard)
// Retourne :
//  - dailyStats       : revenus + nb commandes des 7 derniers jours
//                        (jours sans commande inclus avec valeur 0,
//                        pour que la courbe ne saute pas de dates)
//  - statusBreakdown  : répartition des commandes par statut
//  - topProducts      : top 5 des produits les plus vendus (quantité)
// ================================================================
export const getDashboardCharts = async (req: Request, res: Response) => {
  try {
    const DAYS = 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (DAYS - 1));
    startDate.setHours(0, 0, 0, 0);

    const [dailyRaw, statusRaw, topProductsRaw] = await Promise.all([
      // Revenus + nb commandes par jour (7 derniers jours, hors annulées)
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            orderStatus: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$totalAmount" },
            orders: { $sum: 1 },
          },
        },
      ]),

      // Répartition de TOUTES les commandes par statut (vue globale)
      Order.aggregate([
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      ]),

      // Top 5 produits les plus vendus (par quantité, hors commandes annulées)
      Order.aggregate([
        { $match: { orderStatus: { $ne: "cancelled" } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: { $ifNull: ["$items.name", "Produit"] },
            qty: { $sum: "$items.quantity" },
          },
        },
        { $sort: { qty: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // On remplit les 7 jours même sans commande, pour avoir une courbe continue
    const dailyMap = new Map(dailyRaw.map((d: any) => [d._id, d]));
    const dailyStats: { date: string; revenue: number; orders: number }[] = [];

    for (let i = 0; i < DAYS; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
      const found = dailyMap.get(key) as any;
      dailyStats.push({
        date: key,
        revenue: found?.revenue || 0,
        orders: found?.orders || 0,
      });
    }

    const statusBreakdown = statusRaw.map((s: any) => ({
      status: s._id || "unknown",
      count: s.count,
    }));

    const topProducts = topProductsRaw.map((p: any) => ({
      name: p._id,
      qty: p.qty,
    }));

    res.json({
      success: true,
      data: { dailyStats, statusBreakdown, topProducts },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
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

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { id } = req.params;
    const { role } = req.body as { role?: "user" | "admin" };

    if (!role || !["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role invalide. Utilisez 'user' ou 'admin'.",
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "Utilisateur introuvable" });
    }

    if (
      targetUser._id.toString() === (req.user as any)._id.toString() &&
      role === "user"
    ) {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas retirer vos propres droits admin",
      });
    }

    if (
      targetUser.email?.toLowerCase() ===
        process.env.ADMIN_EMAIL?.toLowerCase() &&
      role === "user"
    ) {
      return res.status(400).json({
        success: false,
        message: "Impossible de retirer les droits de l'admin principal",
      });
    }

    targetUser.role = role;
    await targetUser.save();
    invalidateCache("admin/users");

    res.json({
      success: true,
      message:
        role === "admin"
          ? "Utilisateur promu administrateur"
          : "Droits administrateur retirés",
      data: targetUser,
    });
  } catch (error: any) {
    console.error("UPDATE USER ROLE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};