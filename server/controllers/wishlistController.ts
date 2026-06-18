import { Request, Response } from "express";
import Product from "../models/Products.js";
import User from "../models/User.js";
import { invalidateCache } from "../middleware/cache.js";

export const getWishlist = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("wishlist")
      .lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: user.wishlist });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleWishlist = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    // Vérifie produit + user en parallèle
    const [product, user] = await Promise.all([
      Product.exists({ _id: productId }), // exists() plus léger que findById
      User.findById(req.user._id).select("wishlist"),
    ]);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isInWishlist = user.wishlist.some((id) => id.toString() === productId);

    // $pull ou $addToSet directement en DB, pas de find + save
    await User.findByIdAndUpdate(
      req.user._id,
      isInWishlist
        ? { $pull: { wishlist: productId } }
        : { $addToSet: { wishlist: productId } }
    );

    invalidateCache("wishlist");
    res.json({
      success: true,
      added: !isInWishlist,
      message: !isInWishlist ? "Added to wishlist" : "Removed from wishlist",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeFromWishlist = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { wishlist: req.params.productId } },
      { new: true }
    ).populate("wishlist").lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    invalidateCache("wishlist");
    res.json({ success: true, data: user.wishlist });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};