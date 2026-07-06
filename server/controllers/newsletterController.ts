import { Request, Response } from "express";
import Newsletter from "../models/Newsletter.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const subscribe = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Adresse email invalide",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await Newsletter.findOne({ email: normalizedEmail });

    if (existing) {
      if (existing.active) {
        return res.status(409).json({
          success: false,
          message: "Cet email est déjà inscrit à la newsletter",
        });
      }
      existing.active = true;
      existing.subscribedAt = new Date();
      await existing.save();
      return res.status(200).json({
        success: true,
        message: "Inscription réactivée avec succès",
      });
    }

    const subscriber = await Newsletter.create({ email: normalizedEmail });

    return res.status(201).json({
      success: true,
      message: "Inscription réussie",
      data: subscriber,
    });
  } catch (error) {
    console.error("Newsletter subscribe error:", error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue, réessaie plus tard",
    });
  }
};

export const unsubscribe = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email requis" });
    }

    const subscriber = await Newsletter.findOne({ email: email.toLowerCase().trim() });
    if (!subscriber) {
      return res.status(404).json({ success: false, message: "Email non trouvé" });
    }

    subscriber.active = false;
    await subscriber.save();

    return res.status(200).json({ success: true, message: "Désinscription réussie" });
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    return res.status(500).json({ success: false, message: "Une erreur est survenue" });
  }
};

// Route admin optionnelle — liste des abonnés actifs
export const getAllSubscribers = async (req: Request, res: Response) => {
  try {
    const subscribers = await Newsletter.find({ active: true }).sort({ subscribedAt: -1 });
    return res.status(200).json({ success: true, data: subscribers });
  } catch (error) {
    console.error("Get subscribers error:", error);
    return res.status(500).json({ success: false, message: "Une erreur est survenue" });
  }
};