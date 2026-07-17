import { Request, Response } from "express";
import Cart from "../models/Cart.js";
import Product from "../models/Products.js";
import Offer from "../models/Offer.js";
import { invalidateCache } from "../middleware/cache.js";

// 👇 Revalide le prix de CHAQUE item du panier :
// - item lié à un produit + une offre → si l'offre est encore valide (dates +
//   isActive + correspond bien au produit), prix = prix produit remisé ;
//   sinon retour au prix normal du produit ET détachement de l'offre.
// - item "offre libre" (sans produit, offerId seul) → si l'offre est encore
//   valide, on met à jour le prix + le snapshot (titre/image) ; si l'offre a
//   expiré / a été désactivée / supprimée, IMPOSSIBLE de revenir à un "prix
//   normal" (il n'y a pas de produit dessous) → l'item est retiré du panier.
// ⚠️ Nécessite que cart.items.product soit déjà populate (name images price stock).
const syncCartItemsPricing = async (cart: any): Promise<boolean> => {
  if (!cart.items || cart.items.length === 0) return false;

  const offerIds = cart.items
    .filter((item: any) => item.offerId)
    .map((item: any) => item.offerId);

  if (offerIds.length === 0) return false;

  const offers = await Offer.find({ _id: { $in: offerIds } }).lean();
  const offerMap = new Map(offers.map((o: any) => [String(o._id), o]));
  const now = new Date();
  let changed = false;

  const itemsToKeep: any[] = [];

  cart.items.forEach((item: any) => {
    if (!item.offerId) {
      itemsToKeep.push(item);
      return;
    }

    const offer = offerMap.get(String(item.offerId));

    // ---- Cas 1 : item lié à un produit ----
    if (item.product) {
      const productId = item.product?._id
        ? String(item.product._id)
        : String(item.product);
      const productPrice = Number(item.product?.price);

      if (!productId || Number.isNaN(productPrice)) {
        itemsToKeep.push(item);
        return;
      }

      const isOfferStillValid =
        offer &&
        offer.isActive !== false &&
        offer.product &&
        String(offer.product) === productId &&
        new Date(offer.startDate) <= now &&
        new Date(offer.endDate) >= now;

      if (isOfferStillValid) {
        const discounted =
          Math.round(
            (productPrice - (productPrice * offer.discountPercentage) / 100) * 100
          ) / 100;

        if (item.price !== discounted) {
          item.price = discounted;
          changed = true;
        }
      } else {
        // Offre expirée/désactivée/supprimée : retour au prix normal du produit
        if (item.price !== productPrice) {
          item.price = productPrice;
          changed = true;
        }
        if (item.offerId) {
          item.offerId = null;
          changed = true;
        }
      }

      itemsToKeep.push(item);
      return;
    }

    // ---- Cas 2 : offre "libre" (sans produit lié) ----
    const isFreeOfferStillValid =
      offer &&
      offer.isActive !== false &&
      !offer.product &&
      new Date(offer.startDate) <= now &&
      new Date(offer.endDate) >= now;

    if (isFreeOfferStillValid) {
      const originalPrice = Number(offer.originalPrice) || 0;
      const finalPrice =
        Math.round(
          (originalPrice - (originalPrice * offer.discountPercentage) / 100) * 100
        ) / 100;

      if (item.price !== finalPrice) {
        item.price = finalPrice;
        changed = true;
      }

      const cover = offer.images && offer.images.length > 0 ? offer.images[0] : null;
      if (item.offerTitle !== offer.title) {
        item.offerTitle = offer.title;
        changed = true;
      }
      if (item.offerImage !== cover) {
        item.offerImage = cover;
        changed = true;
      }

      itemsToKeep.push(item);
    } else {
      // Offre libre expirée/désactivée/supprimée → impossible de "revenir" à un
      // prix normal (pas de produit dessous), on retire l'item du panier.
      changed = true;
    }
  });

  if (changed) {
    cart.items = itemsToKeep as any;
  }

  return changed;
};

export const getCart = async (req: Request, res: Response) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
      return res.json({ success: true, data: cart });
    }

    await cart.populate("items.product", "name images price stock");

    // 👇 CORRECTION — un item "offre libre" (sans produit) est VALIDE,
    // avant on le filtrait par erreur car item.product était null
    const validItems = cart.items.filter(
      (item: any) => item.product != null || item.offerId != null
    );
    const hadInvalidItems = validItems.length !== cart.items.length;
    if (hadInvalidItems) {
      cart.items = validItems as any;
    }

    const pricingChanged = await syncCartItemsPricing(cart);

    if (hadInvalidItems || pricingChanged) {
      cart.calculateTotal();
      await cart.save();
    }

    res.json({ success: true, data: cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addToCart = async (req: Request, res: Response) => {
  try {
    const { productId, quantity = 1, size, offerId } = req.body;

    // 👇 AJOUT — Cas "offre libre" : aucun produit choisi, seulement une offre
    // (offre créée sans produit lié, avec ses propres images).
    if (!productId && offerId) {
      const [offer, cart] = await Promise.all([
        Offer.findById(offerId).lean(),
        Cart.findOne({ user: req.user._id }),
      ]);

      if (!offer) {
        return res.status(404).json({ success: false, message: "Offer not found" });
      }
      if (offer.product) {
        // Cette offre EST liée à un produit → il faut passer par la liste de produits
        return res.status(400).json({
          success: false,
          message: "Cette offre est liée à un produit, veuillez le sélectionner",
        });
      }

      const now = new Date();
      const isExpired = offer.endDate && new Date(offer.endDate) < now;
      const notStarted = offer.startDate && new Date(offer.startDate) > now;
      if (isExpired || notStarted || offer.isActive === false) {
        return res.status(400).json({ success: false, message: "Offer is not active" });
      }

      const originalPrice = Number(offer.originalPrice) || 0;
      const finalPrice =
        Math.round(
          (originalPrice - (originalPrice * offer.discountPercentage) / 100) * 100
        ) / 100;
      const cover = offer.images && offer.images.length > 0 ? offer.images[0] : null;

      const activeCart = cart || new Cart({ user: req.user._id, items: [] });

      // Une offre libre = un seul type d'item par offre (pas de notion de taille)
      const existingItem = activeCart.items.find(
        (item) => item.offerId && String(item.offerId) === String(offerId) && !item.product
      );

      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.price = finalPrice;
      } else {
        activeCart.items.push({
          product: null,
          quantity,
          price: finalPrice,
          offerId,
          offerTitle: offer.title,
          offerImage: cover,
        } as any);
      }

      activeCart.calculateTotal();
      await activeCart.save();
      invalidateCache("cart");

      return res.json({ success: true, data: activeCart });
    }

    // ---- Cas normal : produit sélectionné (avec ou sans offre liée) ----
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

    let finalPrice = product.price;
    let validatedOfferId: string | null = null;

    if (offerId) {
      const offer = await Offer.findById(offerId).lean();

      if (!offer) {
        return res.status(404).json({ success: false, message: "Offer not found" });
      }

      if (offer.product?.toString() !== productId) {
        return res
          .status(400)
          .json({ success: false, message: "Offer does not match this product" });
      }

      const now = new Date();
      const isExpired = offer.endDate && new Date(offer.endDate) < now;
      const notStarted = offer.startDate && new Date(offer.startDate) > now;

      if (isExpired || notStarted || offer.isActive === false) {
        return res.status(400).json({ success: false, message: "Offer is not active" });
      }

      finalPrice =
        Math.round(
          (product.price - (product.price * offer.discountPercentage) / 100) * 100
        ) / 100;
      validatedOfferId = (offer._id as any).toString();
    }

    const activeCart = cart || new Cart({ user: req.user._id, items: [] });

    const existingItem = activeCart.items.find(
      (item) => item.product && item.product.toString() === productId && item.size === size
    );

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.price = finalPrice;
      existingItem.offerId = validatedOfferId as any;
    } else {
      activeCart.items.push({
        product: productId,
        quantity,
        price: finalPrice,
        size,
        offerId: validatedOfferId,
      } as any);
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
      (item) => item.product && item.product.toString() === productId && item.size === size
    );
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not in cart" });
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter(
        (item) => !(item.product && item.product.toString() === productId)
      );
    } else {
      if (product && product.stock < quantity) {
        return res.status(400).json({ success: false, message: "Insufficient stock" });
      }
      item.quantity = quantity;
    }

    await cart.populate("items.product", "name images price stock");
    await syncCartItemsPricing(cart);
    cart.calculateTotal();
    await cart.save();
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
        !item.product ||
        item.product.toString() !== req.params.productId ||
        item.size !== size
    );

    await cart.populate("items.product", "name images price stock");
    await syncCartItemsPricing(cart);
    cart.calculateTotal();
    await cart.save();
    invalidateCache("cart");

    res.json({ success: true, data: cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 👇 AJOUT — mise à jour de quantité pour un item "offre libre" (sans produit)
export const updateOfferCartItem = async (req: Request, res: Response) => {
  try {
    const { quantity } = req.body;
    const { offerId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.find(
      (item) => item.offerId && String(item.offerId) === offerId && !item.product
    );
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not in cart" });
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter(
        (item) => !(item.offerId && String(item.offerId) === offerId && !item.product)
      );
    } else {
      item.quantity = quantity;
    }

    await cart.populate("items.product", "name images price stock");
    await syncCartItemsPricing(cart);
    cart.calculateTotal();
    await cart.save();
    invalidateCache("cart");

    res.json({ success: true, data: cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 👇 AJOUT — suppression d'un item "offre libre" (sans produit)
export const removeOfferCartItem = async (req: Request, res: Response) => {
  try {
    const { offerId } = req.params;
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      (item) => !(item.offerId && String(item.offerId) === offerId && !item.product)
    );

    await cart.populate("items.product", "name images price stock");
    await syncCartItemsPricing(cart);
    cart.calculateTotal();
    await cart.save();
    invalidateCache("cart");

    res.json({ success: true, data: cart });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clearCart = async (req: Request, res: Response) => {
  try {
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