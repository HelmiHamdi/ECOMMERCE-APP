import { Request, Response } from "express";
import Offer from "../models/Offer.js";
import { invalidateCache } from "../middleware/cache.js";
import cloudinary from "../config/cloudinary.js"; // 👈 adaptez le chemin si besoin

// ------- Upload d'un buffer (mémoire, via multer memoryStorage) vers Cloudinary -------
const uploadBufferToCloudinary = (
  buffer: Buffer,
  folder: string
): Promise<{ secure_url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error("Cloudinary upload failed"));
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

// 👇 AJOUT — supprime une image Cloudinary à partir de son URL (best-effort :
// ne bloque jamais la requête principale si la suppression échoue)
const destroyCloudinaryImage = async (imageUrl: string) => {
  try {
    const match = imageUrl.match(/\/v\d+\/(.+)\.[a-z0-9]+$/i);
    const publicId = match ? match[1] : null;
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (err) {
    console.error("Cloudinary destroy failed:", err);
  }
};

// Calcule finalPrice manuellement (le plugin mongoose-lean-virtuals n'est pas
// installé, donc les virtuals ne sont pas inclus sur les documents .lean()).
const withFinalPrice = <T extends Record<string, any>>(offer: T) => {
  const originalPrice = Number(offer.originalPrice) || 0;
  const discountPercentage = Number(offer.discountPercentage) || 0;
  const finalPrice =
    Math.round((originalPrice - (originalPrice * discountPercentage) / 100) * 100) / 100;
  return { ...offer, finalPrice };
};

// 👇 AJOUT — Une offre "libre" (sans produit lié) n'a aucun moyen de "revenir"
// à un prix normal une fois expirée (contrairement à une offre liée à un
// produit, qui redevient simplement invisible / le produit reprend son prix
// normal automatiquement — voir attachActiveOffers dans productController).
// On la supprime donc automatiquement dès qu'elle expire, avec ses images
// Cloudinary associées. Appelé (lazy cleanup) à chaque lecture des listes
// d'offres — pas besoin de tâche planifiée séparée.
const cleanupExpiredFreeOffers = async () => {
  const now = new Date();
  const expired = await Offer.find({
    product: null,
    endDate: { $lt: now },
  }).lean();

  if (expired.length === 0) return;

  await Promise.all(
    expired.flatMap((offer: any) =>
      (offer.images || []).map((url: string) => destroyCloudinaryImage(url))
    )
  );

  await Offer.deleteMany({ _id: { $in: expired.map((o: any) => o._id) } });
  invalidateCache("offers");
};

// ------- Route publique (client) — uniquement les offres actives et valides aujourd'hui -------
export const getOffers = async (req: Request, res: Response) => {
  try {
    await cleanupExpiredFreeOffers(); // 👈 AJOUT

    const now = new Date();
    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate("product", "name images price")
      .sort("-createdAt")
      .lean();

    res.json({ success: true, data: offers.map(withFinalPrice) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ------- Route admin — TOUTES les offres (actives, inactives, expirées, futures) -------
export const getAllOffers = async (req: Request, res: Response) => {
  try {
    await cleanupExpiredFreeOffers(); // 👈 AJOUT

    const offers = await Offer.find()
      .populate("product", "name images price")
      .sort("-createdAt")
      .lean();

    res.json({ success: true, data: offers.map(withFinalPrice) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOffer = async (req: Request, res: Response) => {
  try {
    // Pas de populate ici : le formulaire d'édition a besoin de l'id brut du produit
    // (pas d'un objet populate) pour pré-remplir un sélecteur de produit.
    const offer = await Offer.findById(req.params.id).lean();
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }
    res.json({ success: true, data: withFinalPrice(offer) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOffer = async (req: Request, res: Response) => {
  try {
    const payload: Record<string, any> = {
      title: req.body.title,
      description: req.body.description,
      code: req.body.code,
      originalPrice: Number(req.body.originalPrice),
      discountPercentage: Number(req.body.discountPercentage),
      startDate: req.body.startDate,
      endDate: req.body.endDate,
    };

    // Produit lié optionnel : on ne l'ajoute au payload que s'il est fourni,
    // pour éviter d'envoyer une string vide à un champ ObjectId (CastError).
    if (req.body.product) {
      payload.product = req.body.product;
    }

    // 👇 AJOUT — jusqu'à 10 images, utiles UNIQUEMENT si l'offre n'a PAS de
    // produit lié (sinon les images du produit sont utilisées à l'affichage).
    // req.files vient de multer (memoryStorage, champ "images", array(10)).
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas ajouter plus de 10 images.",
      });
    }

    if (files.length > 0) {
      const uploaded = await Promise.all(
        files.map((file) => uploadBufferToCloudinary(file.buffer, "offers"))
      );
      payload.images = uploaded.map((u) => u.secure_url);
    }

    // Il faut au moins un produit OU une image pour qu'une offre ait du contenu visuel
    if (!payload.product && (!payload.images || payload.images.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Veuillez sélectionner un produit ou ajouter au moins une image",
      });
    }

    const offer = await Offer.create(payload);
    invalidateCache("offers");
    invalidateCache("products"); // 👈 le prix du produit lié change côté client
    res.status(201).json({ success: true, data: withFinalPrice(offer.toObject()) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOffer = async (req: Request, res: Response) => {
  try {
    const existing = await Offer.findById(req.params.id).lean();
    if (!existing) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    const payload: Record<string, any> = {
      title: req.body.title,
      description: req.body.description,
      code: req.body.code,
      originalPrice: Number(req.body.originalPrice),
      discountPercentage: Number(req.body.discountPercentage),
      startDate: req.body.startDate,
      endDate: req.body.endDate,
    };

    // 👇 Produit optionnel : "" (chaîne vide) signifie que le client retire
    // volontairement le produit lié → on force `null`. Si le champ n'est pas
    // envoyé du tout, on ne touche pas au produit existant.
    if (req.body.product) {
      payload.product = req.body.product;
    } else if (req.body.product === "") {
      payload.product = null;
    }

    if (req.body.isActive !== undefined) {
      payload.isActive = req.body.isActive === "true" || req.body.isActive === true;
    }

    // 👇 AJOUT — gestion des images multiples (conservées + nouvelles),
    // sur le même principe que "existingImages" pour les produits.
    const files = (req.files as Express.Multer.File[]) || [];

    let keptImages: string[] = existing.images || [];
    if (req.body.existingImages !== undefined) {
      try {
        const parsed = JSON.parse(req.body.existingImages);
        keptImages = Array.isArray(parsed) ? parsed : [];
      } catch {
        keptImages = [];
      }
    }

    if (keptImages.length + files.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas dépasser 10 images par offre.",
      });
    }

    if (req.body.existingImages !== undefined || files.length > 0) {
      const uploaded = files.length
        ? await Promise.all(files.map((file) => uploadBufferToCloudinary(file.buffer, "offers")))
        : [];
      payload.images = [...keptImages, ...uploaded.map((u) => u.secure_url)];

      // Supprime sur Cloudinary les images que l'utilisateur a retirées
      const removedImages = (existing.images || []).filter(
        (url: string) => !keptImages.includes(url)
      );
      if (removedImages.length > 0) {
        await Promise.all(removedImages.map((url: string) => destroyCloudinaryImage(url)));
      }
    }

    // Vérifie qu'après update l'offre garde bien un produit ou une image
    const willHaveProduct =
      payload.product !== undefined ? !!payload.product : !!existing.product;
    const finalImages = payload.images !== undefined ? payload.images : existing.images || [];
    const willHaveImages = finalImages.length > 0;

    if (!willHaveProduct && !willHaveImages) {
      return res.status(400).json({
        success: false,
        message: "L'offre doit conserver un produit ou au moins une image",
      });
    }

    const offer = await Offer.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).lean();
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }
    invalidateCache("offers");
    invalidateCache("products");
    res.json({ success: true, data: withFinalPrice(offer) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOffer = async (req: Request, res: Response) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }
    // 👇 AJOUT — nettoie les images Cloudinary de l'offre supprimée
    if (offer.images && offer.images.length > 0) {
      await Promise.all(offer.images.map((url) => destroyCloudinaryImage(url)));
    }
    invalidateCache("offers");
    invalidateCache("products");
    res.json({ success: true, message: "Offer deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};