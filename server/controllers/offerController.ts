import { Request, Response } from "express";
import Offer from "../models/Offer.js";
import { invalidateCache } from "../middleware/cache.js";
import cloudinary from "../config/cloudinary.js";

const VALID_STATUSES = ["in_stock", "incoming", "out_of_stock", "on_order_48h"];

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


const withFinalPrice = <T extends Record<string, any>>(offer: T) => {
  const originalPrice = Number(offer.originalPrice) || 0;
  const discountPercentage = Number(offer.discountPercentage) || 0;
  const finalPrice =
    Math.round((originalPrice - (originalPrice * discountPercentage) / 100) * 100) / 100;
  return { ...offer, finalPrice };
};


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


export const getOffers = async (req: Request, res: Response) => {
  try {
    await cleanupExpiredFreeOffers();

    const now = new Date();
    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate("product", "name images price status")
      .sort("-createdAt")
      .lean();

    res.json({ success: true, data: offers.map(withFinalPrice) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getAllOffers = async (req: Request, res: Response) => {
  try {
    await cleanupExpiredFreeOffers();

    const offers = await Offer.find()
      .populate("product", "name images price status")
      .sort("-createdAt")
      .lean();

    res.json({ success: true, data: offers.map(withFinalPrice) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOffer = async (req: Request, res: Response) => {
  try {

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

  
    if (req.body.product) {
      payload.product = req.body.product;
    }

   
    if (req.body.status !== undefined) {
      if (!VALID_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ success: false, message: "Statut invalide" });
      }
      payload.status = req.body.status;
    }

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

    if (!payload.product && (!payload.images || payload.images.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Veuillez sélectionner un produit ou ajouter au moins une image",
      });
    }

    const offer = await Offer.create(payload);
    invalidateCache("offers");
    invalidateCache("products");
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


    if (req.body.product) {
      payload.product = req.body.product;
    } else if (req.body.product === "") {
      payload.product = null;
    }

   
    if (req.body.status !== undefined) {
      if (!VALID_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ success: false, message: "Statut invalide" });
      }
      payload.status = req.body.status;
    }

    if (req.body.isActive !== undefined) {
      payload.isActive = req.body.isActive === "true" || req.body.isActive === true;
    }


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

      
      const removedImages = (existing.images || []).filter(
        (url: string) => !keptImages.includes(url)
      );
      if (removedImages.length > 0) {
        await Promise.all(removedImages.map((url: string) => destroyCloudinaryImage(url)));
      }
    }

   
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