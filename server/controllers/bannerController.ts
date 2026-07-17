import { Request, Response } from "express";
import Banner from "../models/Banner.js";
import cloudinary from "../config/cloudinary.js";
import { invalidateCache } from "../middleware/cache.js";


export const getBanners = async (req: Request, res: Response) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: banners });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getAllBannersAdmin = async (req: Request, res: Response) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: banners });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBanner = async (req: Request, res: Response) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }
    res.json({ success: true, data: banner });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBanner = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload an image" });
    }

    const imageUrl: string = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "shop-mobile/banners" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!.secure_url);
        }
      );
      uploadStream.end(req.file!.buffer);
    });

    const banner = await Banner.create({
      title: req.body.title,
      subtitle: req.body.subtitle,
      link: req.body.link || "/shop",
      order: req.body.order ? Number(req.body.order) : 0,
      isActive: req.body.isActive !== undefined ? req.body.isActive === "true" : true,
      image: imageUrl,
    });

    invalidateCache("banners");
    res.status(201).json({ success: true, data: banner });
  } catch (error: any) {
    console.error("CREATE BANNER ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBanner = async (req: Request, res: Response) => {
  try {
    const updates: any = { ...req.body };

    if (updates.order !== undefined) updates.order = Number(updates.order);
    if (updates.isActive !== undefined) updates.isActive = updates.isActive === "true" || updates.isActive === true;

    if (req.file) {
     
      const existing = await Banner.findById(req.params.id);
      if (existing?.image) {
        const publicIdMatch = existing.image.match(/\/v\d+\/(.+)\.[a-z]+$/);
        const publicId = publicIdMatch ? publicIdMatch[1] : null;
        if (publicId) await cloudinary.uploader.destroy(publicId);
      }

      const imageUrl: string = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "shop-mobile/banners" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result!.secure_url);
          }
        );
        uploadStream.end(req.file!.buffer);
      });

      updates.image = imageUrl;
    }

    const banner = await Banner.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    invalidateCache("banners");
    res.json({ success: true, data: banner });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBanner = async (req: Request, res: Response) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    if (banner.image) {
      const publicIdMatch = banner.image.match(/\/v\d+\/(.+)\.[a-z]+$/);
      const publicId = publicIdMatch ? publicIdMatch[1] : null;
      if (publicId) await cloudinary.uploader.destroy(publicId);
    }

    await Banner.findByIdAndDelete(req.params.id);
    invalidateCache("banners");
    res.json({ success: true, message: "Banner deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};