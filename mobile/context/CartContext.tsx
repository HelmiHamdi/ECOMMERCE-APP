import { Product } from "@/constants/types";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import Toast from "react-native-toast-message";
import { useLanguage } from "@/context/LanguageContext";

export type CartItem = {
  id: string;
  productId: string | null; // 👈 CORRECTION — peut être null pour une offre libre
  product: Product | null; // 👈 CORRECTION
  quantity: number;
  size: string;
  price: number;
  offerId?: string | null;
  offerTitle?: string | null; // 👈 AJOUT
  offerImage?: string | null; // 👈 AJOUT
};

type CartContextType = {
  cartItems: CartItem[];
  addToCart: (product: Product, size: string, offerId?: string) => Promise<void>;
  addOfferToCart: (offerId: string) => Promise<void>; // 👈 AJOUT — offre libre
  removeFromCart: (itemId: string, size: string) => Promise<void>;
  removeOfferFromCart: (offerId: string) => Promise<void>; // 👈 AJOUT
  updateCartItemQuantity: (
    itemId: string,
    quantity: number,
    size: string,
  ) => Promise<void>;
  updateOfferCartItemQuantity: (offerId: string, quantity: number) => Promise<void>; // 👈 AJOUT
  clearCart: () => Promise<void>;
  cartTotal: number;
  itemCount: number;
  isloading: boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const { t } = useLanguage();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isloading, setIsLoading] = useState(false);
  const [cartTotal, setCartTotal] = useState(0);

  const fetchCart = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      const { data } = await api.get("/cart", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data.success && data.data) {
        const serverCart = data.data;
        // 👇 CORRECTION — on garde aussi les items "offre libre" (sans produit)
        const mappedItems: CartItem[] = serverCart.items
          .filter((item: any) => item.product != null || item.offerId != null)
          .map((item: any) => ({
            id: item._id,
            productId: item.product?._id || null,
            product: item.product || null,
            quantity: item.quantity,
            size: item?.size || "",
            price: item.price,
            offerId: item.offerId || null,
            offerTitle: item.offerTitle || null,
            offerImage: item.offerImage || null,
          }));
        setCartItems(mappedItems);
        setCartTotal(serverCart.totalAmount);
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (product: Product, size: string, offerId?: string) => {
    if (!isSignedIn) {
      return Toast.show({
        text1: t("loginToAddToCart"),
        type: "error",
      });
    }
    try {
      setIsLoading(true);
      const token = await getToken();
      const { data } = await api.post(
        "/cart/add",
        {
          productId: product._id,
          quantity: 1,
          size,
          ...(offerId ? { offerId } : {}),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (data.success) {
        await fetchCart();
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
      Toast.show({
        text1: t("failedToAddToCart"),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 👇 AJOUT — ajoute une offre "libre" (sans produit sélectionné) au panier
  const addOfferToCart = async (offerId: string) => {
    if (!isSignedIn) {
      return Toast.show({
        text1: t("loginToAddToCart"),
        type: "error",
      });
    }
    try {
      setIsLoading(true);
      const token = await getToken();
      const { data } = await api.post(
        "/cart/add",
        {
          quantity: 1,
          offerId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (data.success) {
        await fetchCart();
      }
    } catch (error) {
      console.error("Failed to add offer to cart:", error);
      Toast.show({
        text1: t("failedToAddToCart"),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (productId: string, size: string) => {
    if (!isSignedIn) return;
    try {
      setIsLoading(true);
      const token = await getToken();
      const { data } = await api.delete(
        `/cart/item/${productId}?size=${size}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (data.success) {
        await fetchCart();
      }
    } catch (error) {
      console.error("Failed to remove from cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 👇 AJOUT — retire une offre "libre" du panier
  const removeOfferFromCart = async (offerId: string) => {
    if (!isSignedIn) return;
    try {
      setIsLoading(true);
      const token = await getToken();
      const { data } = await api.delete(`/cart/offer-item/${offerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data.success) {
        await fetchCart();
      }
    } catch (error) {
      console.error("Failed to remove offer from cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCartItemQuantity = async (
    productId: string,
    quantity: number,
    size: string = "M",
  ) => {
    if (!isSignedIn) return;
    if (quantity < 1) return;
    try {
      setIsLoading(true);
      const token = await getToken();
      const { data } = await api.put(
        `/cart/item/${productId}`,
        { quantity, size },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (data.success) {
        await fetchCart();
      }
    } catch (error) {
      console.error("Failed to update quantity:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 👇 AJOUT — met à jour la quantité d'une offre "libre" dans le panier
  const updateOfferCartItemQuantity = async (offerId: string, quantity: number) => {
    if (!isSignedIn) return;
    if (quantity < 1) return;
    try {
      setIsLoading(true);
      const token = await getToken();
      const { data } = await api.put(
        `/cart/offer-item/${offerId}`,
        { quantity },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (data.success) {
        await fetchCart();
      }
    } catch (error) {
      console.error("Failed to update offer quantity:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    if (!isSignedIn) return;
    try {
      setIsLoading(true);
      const token = await getToken();
      const { data } = await api.delete(`/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data.success) {
        setCartItems([]);
        setCartTotal(0);
      }
    } catch (error) {
      console.error("Failed to clear cart :", error);
    } finally {
      setIsLoading(false);
    }
  };

  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    if (isSignedIn) {
      fetchCart();
    } else {
      setCartItems([]);
      setCartTotal(0);
    }
  }, [isSignedIn]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        addOfferToCart,
        removeFromCart,
        removeOfferFromCart,
        updateCartItemQuantity,
        updateOfferCartItemQuantity,
        clearCart,
        cartTotal,
        itemCount,
        isloading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}