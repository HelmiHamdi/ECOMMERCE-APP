import { Request, Response } from "express";
import Devis from "../models/Devis.js";
import AppSettings from "../models/AppSettings.js";
import { invalidateCache } from "../middleware/cache.js";
import { sendNewDevisNotification } from "../utils/sendNotification.js";

// POST /api/devis  (utilisateur connecté)
export const createDevis = async (req: Request, res: Response) => {
  try {
    // Sécurité serveur : on refuse la création si l'admin a masqué la fonctionnalité,
    // même si un utilisateur contourne le frontend et appelle l'API directement.
    const settings = await AppSettings.findOne({ key: "global" }).lean();
    if (!settings?.devisEnabled) {
      return res.status(403).json({
        success: false,
        message: "La demande de devis n'est pas disponible pour le moment",
      });
    }

    const { product, name, phone, email, quantity, size, message } = req.body;

    if (!name || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: "Nom, téléphone et message sont obligatoires",
      });
    }

    const devis = await Devis.create({
      user: (req as any).user._id,
      product: product || undefined,
      name,
      phone,
      email,
      quantity: quantity || 1,
      size,
      message,
    });

    invalidateCache("devis");

    sendNewDevisNotification(devis._id.toString(), name).catch((e) =>
      console.error("sendNewDevisNotification error:", e),
    );

    res.status(201).json({ success: true, data: devis });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/devis/mine  (utilisateur connecté - ses propres demandes)
export const getMyDevis = async (req: Request, res: Response) => {
  try {
    const devis = await Devis.find({ user: (req as any).user._id })
      .populate("product", "name images price")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: devis });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/devis  (admin - liste, filtres, pagination)
export const getAllDevis = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    const query: any = {};
    if (status && status !== "") {
      query.status = status;
    }
    if (search && String(search).trim() !== "") {
      const regex = new RegExp(String(search).trim(), "i");
      query.$or = [{ name: regex }, { phone: regex }, { email: regex }];
    }

    const total = await Devis.countDocuments(query);
    const devis = await Devis.find(query)
      .populate("user", "name email")
      .populate("product", "name images price")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const unreadCount = await Devis.countDocuments({ isReadByAdmin: false });

    res.json({
      success: true,
      data: devis,
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

// GET /api/devis/:id  (admin)
export const getDevisById = async (req: Request, res: Response) => {
  try {
    const devis = await Devis.findById(req.params.id)
      .populate("user", "name email")
      .populate("product", "name images price");

    if (!devis) {
      return res.status(404).json({ success: false, message: "Demande introuvable" });
    }

    if (!devis.isReadByAdmin) {
      devis.isReadByAdmin = true;
      await devis.save();
    }

    res.json({ success: true, data: devis });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/devis/:id  (admin - changer statut / répondre)
export const updateDevisStatus = async (req: Request, res: Response) => {
  try {
    const { status, adminResponse } = req.body;

    const VALID_STATUSES = ["pending", "in_progress", "answered", "rejected", "closed"];
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Statut invalide" });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (adminResponse !== undefined) updates.adminResponse = adminResponse;

    const devis = await Devis.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!devis) {
      return res.status(404).json({ success: false, message: "Demande introuvable" });
    }

    invalidateCache("devis");
    res.json({ success: true, data: devis });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/devis/:id  (admin)
export const deleteDevis = async (req: Request, res: Response) => {
  try {
    const devis = await Devis.findByIdAndDelete(req.params.id);
    if (!devis) {
      return res.status(404).json({ success: false, message: "Demande introuvable" });
    }
    invalidateCache("devis");
    res.json({ success: true, message: "Demande supprimée" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};