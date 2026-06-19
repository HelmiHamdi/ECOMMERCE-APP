import { Request, Response } from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Products.js";
import { invalidateCache } from "../middleware/cache.js";

export const getCart = async (req: Request, res: Response) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate("items.product", "name images price stock")
      .lean();

    if (!cart) {
      const newCart = await Cart.create({ user: req.user._id, items: [] });
      return res.json({ success: true, data: newCart });
    }

    // Filtre les items dont le produit a été supprimé (référence cassée)
    const validItems = cart.items.filter((item: any) => item.product != null);

    if (validItems.length !== cart.items.length) {
      // Des produits orphelins détectés → on nettoie le panier en base
      const orphanProductIds = cart.items
        .filter((item: any) => item.product == null)
        .map((item: any) => item.product); // sera déjà null, donc on doit comparer autrement

      // On recharge le doc (non-lean) pour pouvoir le sauvegarder proprement
      const cartDoc = await Cart.findOne({ user: req.user._id });
      if (cartDoc) {
        const validProductIdsSet = new Set(
          validItems.map((item: any) => item.product._id.toString())
        );
        cartDoc.items = cartDoc.items.filter((item) =>
          validProductIdsSet.has(item.product.toString())
        );
        cartDoc.calculateTotal();
        await cartDoc.save();
      }

      cart.items = validItems;
      cart.totalAmount = validItems.reduce(
        (sum: number, item: any) => sum + item.price * item.quantity,
        0
      );
    }

    res.json({ success: true, data: cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const addToCart = async (req: Request, res: Response) => {
  try {
    const { productId, quantity = 1, size } = req.body;

    // Les deux en parallèle au lieu de séquentiel
    const [product, cart] = await Promise.all([
      Product.findById(productId).select("price stock").lean(),
      Cart.findOne({ user: req.user._id }),
    ]);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    if (product.stock < quantity) {
      return res.status(400).json({ success: false, message: "Insufficient stock" });
    }

    const activeCart = cart || new Cart({ user: req.user._id, items: [] });

    const existingItem = activeCart.items.find(
      (item) => item.product.toString() === productId && item.size === size
    );

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.price = product.price;
    } else {
      activeCart.items.push({ product: productId, quantity, price: product.price, size });
    }

    activeCart.calculateTotal();
    await activeCart.save();
    invalidateCache("cart");

    res.json({ success: true, data: activeCart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const { quantity, size } = req.body;
    const { productId } = req.params;

    const [cart, product] = await Promise.all([
      Cart.findOne({ user: req.user._id }),
      quantity > 0 ? Product.findById(productId).select("stock").lean() : Promise.resolve(null),
    ]);

    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.find(
      (item) => item.product.toString() === productId && item.size === size
    );
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not in cart" });
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter((item) => item.product.toString() !== productId);
    } else {
      if (product && product.stock < quantity) {
        return res.status(400).json({ success: false, message: "Insufficient stock" });
      }
      item.quantity = quantity;
    }

    cart.calculateTotal();
    // Les deux en parallèle
    await Promise.all([
      cart.save(),
      cart.populate("items.product", "name images price stock"),
    ]);
    invalidateCache("cart");

    res.json({ success: true, data: cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeCartItem = async (req: Request, res: Response) => {
  try {
    const { size } = req.query;
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart || !size) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      (item) =>
        item.product.toString() !== req.params.productId || item.size !== size
    );
    cart.calculateTotal();

    await Promise.all([
      cart.save(),
      cart.populate("items.product", "name images price stock"),
    ]);
    invalidateCache("cart");

    res.json({ success: true, data: cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clearCart = async (req: Request, res: Response) => {
  try {
    // findOneAndUpdate au lieu de find + save (une requête au lieu de deux)
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], totalAmount: 0 }
    );
    invalidateCache("cart");
    res.json({ success: true, message: "Cart cleared" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};