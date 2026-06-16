import express from "express";
import {
  getWishlist,
  toggleWishlist,
  removeFromWishlist,
} from "../controllers/wishlistController.js";
import { protect } from "../middleware/auth.js";

const WishlistRouter = express.Router();



WishlistRouter.get("/",protect, getWishlist);
WishlistRouter.post("/:productId",protect, toggleWishlist);
WishlistRouter.delete("/:productId",protect, removeFromWishlist);

export default WishlistRouter;