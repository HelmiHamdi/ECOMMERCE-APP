import { Request, Response } from "express";
import Gif from "../models/Gif.js";
import cloudinary from "../config/cloudinary.js";
import { invalidateCache } from "../middleware/cache.js";

// GET /api/gifs -> public, renvoie le gif actif (ou null)
export const getActiveGif = async (req: Request, res: Response) => {
  try {
    const gif = await Gif.findOne({ isActive: true });
    res.json({ success: true, data: gif || null });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllGifsAdmin = async (req: Request, res: Response) => {
  try {
    const gifs = await Gif.find().sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: gifs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getGif = async (req: Request, res: Response) => {
  try {
    const gif = await Gif.findById(req.params.id);
    if (!gif) return res.status(404).json({ success: false, message: "Gif not found" });
    res.json({ success: true, data: gif });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createGif = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Veuillez uploader un gif" });
    }

    const imageUrl: string = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "shop-mobile/gifs", resource_type: "image" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!.secure_url);
        }
      );
      uploadStream.end(req.file!.buffer);
    });

    const gif = await Gif.create({
      title: req.body.title,
      order: req.body.order ? Number(req.body.order) : 0,
      isActive: false, // toujours inactif à la création, activation manuelle ensuite
      image: imageUrl,
    });

    invalidateCache("gifs");
    res.status(201).json({ success: true, data: gif });
  } catch (error: any) {
    console.error("CREATE GIF ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGif = async (req: Request, res: Response) => {
  try {
    const updates: any = { title: req.body.title };
    if (req.body.order !== undefined) updates.order = Number(req.body.order);

    if (req.file) {
      const existing = await Gif.findById(req.params.id);
      if (existing?.image) {
        const publicIdMatch = existing.image.match(/\/v\d+\/(.+)\.[a-z]+$/);
        const publicId = publicIdMatch ? publicIdMatch[1] : null;
        if (publicId) await cloudinary.uploader.destroy(publicId);
      }

      const imageUrl: string = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "shop-mobile/gifs", resource_type: "image" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result!.secure_url);
          }
        );
        uploadStream.end(req.file!.buffer);
      });

      updates.image = imageUrl;
    }

    const gif = await Gif.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!gif) return res.status(404).json({ success: false, message: "Gif not found" });

    invalidateCache("gifs");
    res.json({ success: true, data: gif });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/gifs/:id/activate -> active ce gif, désactive tous les autres
export const activateGif = async (req: Request, res: Response) => {
  try {
    const gif = await Gif.findById(req.params.id);
    if (!gif) return res.status(404).json({ success: false, message: "Gif not found" });

    await Gif.updateMany({ _id: { $ne: gif._id } }, { isActive: false });
    gif.isActive = true;
    await gif.save();

    invalidateCache("gifs");
    res.json({ success: true, data: gif });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/gifs/:id/deactivate -> plus aucun gif ne s'affiche
export const deactivateGif = async (req: Request, res: Response) => {
  try {
    const gif = await Gif.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!gif) return res.status(404).json({ success: false, message: "Gif not found" });

    invalidateCache("gifs");
    res.json({ success: true, data: gif });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGif = async (req: Request, res: Response) => {
  try {
    const gif = await Gif.findById(req.params.id);
    if (!gif) return res.status(404).json({ success: false, message: "Gif not found" });

    if (gif.image) {
      const publicIdMatch = gif.image.match(/\/v\d+\/(.+)\.[a-z]+$/);
      const publicId = publicIdMatch ? publicIdMatch[1] : null;
      if (publicId) await cloudinary.uploader.destroy(publicId);
    }

    await Gif.findByIdAndDelete(req.params.id);
    invalidateCache("gifs");
    res.json({ success: true, message: "Gif deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};