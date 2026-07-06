import { Request, Response } from "express";
import Product from "../models/Products.js";
import cloudinary from "../config/cloudinary.js";
import { UploadStream } from "cloudinary";
import { sendNewProductNotification } from "../utils/sendNotification.js";
import { invalidateCache } from "../middleware/cache.js";

export const getProducts = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      size,
      minPrice,
      maxPrice,
    } = req.query;

    const query: any = { isActive: true };

    // Filtre par catégorie
    if (category && category !== "") {
      query.category = { $regex: new RegExp(`^${category}$`, "i") };
    }

    // Recherche par nom (et description, pour de meilleurs résultats)
    if (search && String(search).trim() !== "") {
      const regex = new RegExp(String(search).trim(), "i");
      query.$or = [{ name: regex }, { description: regex }];
    }

    // Filtre par taille (le produit doit avoir cette taille dans son tableau "sizes")
    if (size && size !== "") {
      query.sizes = { $regex: new RegExp(`^${size}$`, "i") };
    }

    // Filtre par plage de prix
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      data: products,
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

export const getProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: true,
        message: "Product not found",
      });
    }
    res.json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
     console.log("BODY:", req.body);
    console.log("FILES:", req.files);
    let images: string[] = [];
    if (req.files && (req.files as any).length > 0) {
      const uploadPromises = (req.files as any).map((file: any) => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "shop-mobile/products",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result!.secure_url);
            },
          );
          uploadStream.end(file.buffer);
        });
      });

      images = await Promise.all(uploadPromises);
    }
    let sizes = req.body.sizes || [];
    if (typeof sizes === "string") {
      try {
        sizes = JSON.parse(sizes);
      } catch (e) {
        sizes = sizes
          .split(",")
          .map((s: string) => s.trim())
          .filter((s: string) => s !== "");
      }
    }

    if (!Array.isArray(sizes)) sizes = [sizes];

    const productData = {
      ...req.body,
      images: images,
      sizes,
    };
    if (images.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Please upload at least one image" });
    }
    const product = await Product.create(productData);
    invalidateCache("products");
    await sendNewProductNotification(product.name, product._id.toString());
    res.status(201).json({ success: true, data: product });
  } catch (error: any) {
     console.error("CREATE PRODUCT ERROR:", error); 
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    let images: string[] = [];
    if (req.body.existingImages) {
      if (Array.isArray(req.body.existingImages)) {
        images = [...req.body.existingImages];
      } else {
        images = [req.body.existingImages];
      }
    }
    if (req.files && (req.files as any).length > 0) {
      const uploadPromises = (req.files as any).map((file: any) => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "shop-mobile/products",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result!.secure_url);
            },
          );
          uploadStream.end(file.buffer);
        });
      });

      const newImages = await Promise.all(uploadPromises);
      images = [...images, ...newImages];
    }
    const updates = { ...req.body };
    if (req.body.sizes) {
      let sizes = req.body.sizes;
      if (typeof sizes === "string") {
        try {
          sizes = JSON.parse(sizes);
        } catch (e) {
          sizes = sizes
            .split(",")
            .map((s: string) => s.trim())
            .filter((s: string) => s !== "");
        }
      }
      if (!Array.isArray(sizes)) sizes = [sizes];
      updates.sizes = sizes;
    }
    if (
      req.body.existingImages ||
      (req.files && (req.files as any).length > 0)
    ) {
      updates.images = images;
    }

    delete updates.existingImages;

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    invalidateCache("products");
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
        return res.status(404).json({success:false, message: "Product not found"});
    }
    if (product.images && product.images.length > 0) {
      const deletePromises = product.images.map((imageUrl)=>{
        const publicIdMatch = imageUrl.match(/\/v\d+\/(.+)\.[a-z]+$/);
        const publicId = publicIdMatch ? publicIdMatch[1] : null;
        if (publicId) {
            return cloudinary.uploader.destroy(publicId)
        }
        return Promise.resolve();
      })  
       await Promise.all(deletePromises)
    }
    await Product.findByIdAndDelete(req.params.id)
    invalidateCache("products");
    res.json({success: true, message: "Product deleted"})
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Upload vidéo (séparé)
export const uploadProductVideo = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No video file provided" });
    }

    // Supprimer l'ancienne vidéo Cloudinary si elle existe
    if (product.video) {
      const publicIdMatch = product.video.match(/\/v\d+\/(.+)\.[a-z0-9]+$/);
      const publicId = publicIdMatch ? publicIdMatch[1] : null;
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
      }
    }

    // Upload nouvelle vidéo
    const videoUrl: string = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "shop-mobile/products/videos", resource_type: "video" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!.secure_url);
        }
      );
      uploadStream.end(req.file!.buffer);
    });

    product.video = videoUrl;
    await product.save();

    invalidateCache("products");
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Supprimer vidéo uniquement (séparé)
export const deleteProductVideo = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (!product.video) {
      return res.status(404).json({ success: false, message: "No video to delete" });
    }

    // Supprimer sur Cloudinary
    const publicIdMatch = product.video.match(/\/v\d+\/(.+)\.[a-z0-9]+$/);
    const publicId = publicIdMatch ? publicIdMatch[1] : null;
    if (publicId) {
      await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
    }

    product.video = undefined;
    await product.save();

    invalidateCache("products");
    res.json({ success: true, message: "Video deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
