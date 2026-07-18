import { Request, Response } from "express";
import Product from "../models/Products.js";
import Offer from "../models/Offer.js"; // 👈 AJOUT
import cloudinary from "../config/cloudinary.js";
import { sendNewProductNotification } from "../utils/sendNotification.js";
import { invalidateCache } from "../middleware/cache.js";

const SIZE_REQUIRED_CATEGORIES = ["men", "women", "kids", "shoes"];

const attachActiveOffers = async (products: any[]) => {
  if (products.length === 0) return products;

  const now = new Date();
  const ids = products.map((p) => p._id);

  const activeOffers = await Offer.find({
    product: { $in: ids },
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).lean();

  const offerByProduct = new Map(activeOffers.map((o) => [String(o.product), o]));

  return products.map((p) => {
    const offer = offerByProduct.get(String(p._id));
    if (!offer) return p;

    const originalPrice = Number(p.price) || 0;
    const discountPercentage = Number(offer.discountPercentage) || 0;
    const finalPrice =
      Math.round((originalPrice - (originalPrice * discountPercentage) / 100) * 100) / 100;

    return {
      ...p,
      hasActiveOffer: true,
      discountPercentage,
      finalPrice,
      offerId: offer._id,
    };
  });
};

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
      .limit(Number(limit))
      .lean(); // 👈 nécessaire pour pouvoir ajouter des champs dynamiques (finalPrice, etc.)

    const withOffers = await attachActiveOffers(products); // 👈 AJOUT

    res.json({
      success: true,
      data: withOffers,
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
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({
        success: false, // 👈 CORRECTION — c'était `true` par erreur dans le code d'origine
        message: "Product not found",
      });
    }
    const [withOffer] = await attachActiveOffers([product]); // 👈 AJOUT
    res.json({
      success: true,
      data: withOffer,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);
    console.log("🔍 ENUM CHECK:", (Product.schema.path("category") as any).enumValues);
    let images: string[] = [];
    if (req.files && (req.files as any).length > 0) {
      const uploadPromises = (req.files as any).map((file: any) => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "shop-mobile/products" },
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

    // 👇 AJOUT — validation métier avant d'aller en base
    const category = String(req.body.category || "").toLowerCase();
    if (SIZE_REQUIRED_CATEGORIES.includes(category) && sizes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Sizes are required for this category (men, women, kids, shoes)",
      });
    }
    // 👇 AJOUT — pour les catégories sans tailles, on force un tableau vide (propre)
    if (!SIZE_REQUIRED_CATEGORIES.includes(category)) {
      sizes = [];
    }

    const productData = {
      ...req.body,
      images,
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
      images = Array.isArray(req.body.existingImages)
        ? [...req.body.existingImages]
        : [req.body.existingImages];
    }
    if (req.files && (req.files as any).length > 0) {
      const uploadPromises = (req.files as any).map((file: any) => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "shop-mobile/products" },
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

    if (req.body.sizes !== undefined) {
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

    // 👇 AJOUT — validation métier basée sur la catégorie finale (nouvelle ou existante)
    const category = String(
      updates.category || (await Product.findById(req.params.id).lean())?.category || "",
    ).toLowerCase();

    if (SIZE_REQUIRED_CATEGORIES.includes(category)) {
      const finalSizes = updates.sizes;
      if (finalSizes !== undefined && finalSizes.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Sizes are required for this category (men, women, kids, shoes)",
        });
      }
    } else if (updates.sizes !== undefined) {
      updates.sizes = []; // 👈 nettoie les tailles si catégorie sans tailles
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
      context: "query", // 👈 AJOUT — indispensable pour que le validateur mongoose voie "this.category" correctement
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