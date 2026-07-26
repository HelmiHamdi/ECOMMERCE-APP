import { Request, Response } from "express";
import AppSettings from "../models/AppSettings.js";
import { invalidateCache } from "../middleware/cache.js";

// GET /api/settings  (public - lu par l'app mobile au démarrage / focus écran)
export const getPublicSettings = async (req: Request, res: Response) => {
  try {
    let settings = await AppSettings.findOne({ key: "global" }).lean();
    if (!settings) {
      const created = await AppSettings.create({ key: "global", devisEnabled: false });
      settings = created.toObject();
    }
    res.json({
      success: true,
      data: {
        devisEnabled: settings.devisEnabled,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/settings  (admin uniquement) body: { devisEnabled: boolean }
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { devisEnabled } = req.body;

    if (typeof devisEnabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "devisEnabled doit être un booléen",
      });
    }

    const settings = await AppSettings.findOneAndUpdate(
      { key: "global" },
      { $set: { devisEnabled } },
      { new: true, upsert: true },
    );

    invalidateCache("settings");

    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};