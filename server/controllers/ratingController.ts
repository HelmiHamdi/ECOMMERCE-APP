import { Request, Response } from "express";
import Rating from "../models/Rating.js";

// POST /api/ratings — soumettre ou mettre à jour un rating (create + update)
export const submitRating = async (req: Request, res: Response) => {
  try {
    const clerkId = req.user?.clerkId;
    if (!clerkId) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const { stars, review } = req.body;

    if (!stars || stars < 1 || stars > 5) {
      return res.status(400).json({ success: false, message: "Stars must be between 1 and 5" });
    }

    // Upsert — si l'utilisateur a déjà noté, on met à jour, sinon on crée
    const rating = await Rating.findOneAndUpdate(
      { clerkId },
      { stars, review: review ?? "" },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: rating });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/ratings/me — récupérer mon rating (pour pré-remplir)
export const getMyRating = async (req: Request, res: Response) => {
  try {
    const clerkId = req.user?.clerkId;
    if (!clerkId) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const rating = await Rating.findOne({ clerkId });
    res.json({ success: true, data: rating ?? null });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/ratings/me — supprimer mon rating
export const deleteMyRating = async (req: Request, res: Response) => {
  try {
    const clerkId = req.user?.clerkId;
    if (!clerkId) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const rating = await Rating.findOneAndDelete({ clerkId });

    if (!rating) {
      return res.status(404).json({ success: false, message: "No review found" });
    }

    res.json({ success: true, message: "Review deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/ratings — admin: voir tous les ratings
export const getAllRatings = async (req: Request, res: Response) => {
  try {
    // aggregate plus efficace que find + reduce JS
    const [ratings, statsResult] = await Promise.all([
      Rating.find().sort({ createdAt: -1 }).lean(),
      Rating.aggregate([
        { $group: { _id: null, avg: { $avg: "$stars" }, total: { $sum: 1 } } },
      ]),
    ]);

    const stats = statsResult[0] || { avg: 0, total: 0 };

    res.json({
      success: true,
      data: ratings,
      average: parseFloat(stats.avg.toFixed(2)),
      total: stats.total,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};