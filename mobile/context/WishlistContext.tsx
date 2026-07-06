import { Product, WishlistContextType } from "@/constants/types";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const { getToken, isSignedIn } = useAuth();

 
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const fetchWishlist = useCallback(async () => {
    if (!isSignedIn) {
      setWishlist([]);
      return;
    }
    setLoading(true);
    try {
      const token = await getTokenRef.current();
      const { data } = await api.get("/wishlist", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setWishlist(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch wishlist:", error);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]); 


  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const toggleWishlist = useCallback(async (product: Product) => {
    if (!isSignedIn) return;

   
    setWishlist((prev) => {
      const exists = prev.some((item) => item._id === product._id);
      return exists
        ? prev.filter((item) => item._id !== product._id)
        : [...prev, product];
    });

    try {
      const token = await getTokenRef.current();
      const { data } = await api.post(
        `/wishlist/${product._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      
      if (!data.success) {
        setWishlist((prev) => {
          const exists = prev.some((item) => item._id === product._id);
          return exists
            ? prev.filter((item) => item._id !== product._id)
            : [...prev, product];
        });
      }
    } catch (error) {
      console.error("Failed to toggle wishlist:", error);
     
      await fetchWishlist();
    }
  }, [isSignedIn, fetchWishlist]);

  const isInWishlist = useCallback((productId: string): boolean => {
    return wishlist.some((item) => item._id === productId);
  }, [wishlist]);

  return (
    <WishlistContext.Provider
      value={{ wishlist, loading, toggleWishlist, isInWishlist, fetchWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}