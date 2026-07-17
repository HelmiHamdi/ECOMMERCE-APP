import express from "express";
import { protect } from "../middleware/auth.js";
import {
  addToCart,
  clearCart,
  getCart,
  removeCartItem,
  removeOfferCartItem,
  updateCartItem,
  updateOfferCartItem,
} from "../controllers/cartController.js";

const CartRouter = express.Router();

CartRouter.get('/', protect, getCart);
CartRouter.post('/add', protect, addToCart);
CartRouter.put('/item/:productId', protect, updateCartItem);
CartRouter.delete('/item/:productId', protect, removeCartItem);

// 👇 AJOUT — routes dédiées aux items "offre libre" (sans produit)
CartRouter.put('/offer-item/:offerId', protect, updateOfferCartItem);
CartRouter.delete('/offer-item/:offerId', protect, removeOfferCartItem);

CartRouter.delete('/', protect, clearCart);

export default CartRouter;