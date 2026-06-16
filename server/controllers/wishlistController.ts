import { Request, Response } from "express";
import User from "../models/User.js";
import Product from "../models/Products.js";

// GET /api/wishlist — récupérer la wishlist de l'utilisateur connecté
export const getWishlist = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id).populate("wishlist");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: user.wishlist });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/wishlist/:productId — ajouter ou retirer (toggle)
export const toggleWishlist = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

   const index = user.wishlist.findIndex(
  (id) => id.toString() === productId
);
    let added: boolean;

    if (index === -1) {
      // Pas encore dans la wishlist → on ajoute
      user.wishlist.push(productId as any);
      added = true;
    } else {
      // Déjà présent → on retire
      user.wishlist.splice(index, 1);
      added = false;
    }

    await user.save();

    res.json({
      success: true,
      added,
      message: added ? "Added to wishlist" : "Removed from wishlist",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/wishlist/:productId — retirer explicitement
export const removeFromWishlist = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { wishlist: productId } },
      { new: true }
    ).populate("wishlist");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, data: user.wishlist });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};