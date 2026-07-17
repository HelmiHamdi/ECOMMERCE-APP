import { ReactNode } from "react";

export interface User {
    _id: string;
    name: string;
    email: string;
    role: "user" | "admin";
    phone?: string;
    address?: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    createdAt: string;
}

export interface Product {
    _id: string;
    name: string;
    description: string;
    price: number;
    comparePrice?: number;
    finalPrice?: number;
    hasActiveOffer?: boolean;
    discountPercentage?: number;
    offerId?: string;
    images: string[];
    sizes?: string[];
    video?: string; 
    category:
        | {
              _id: string;
              name: string;
          }
        | string;
    stock: number;
    ratings: {
        average: number;
        count: number;
    };
    isFeatured: boolean;
    isActive: boolean;
    createdAt: string;
}

export type ProductCardProps = {
    product: Product;
};
export interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
  order: number;
  isActive: boolean;
}

// 👇 CORRECTION — product devient optionnel : un item du panier peut être
// une offre "libre" (sans produit sélectionné dans la liste), auquel cas
// offerId + offerTitle + offerImage sont utilisés à la place.
export interface CartItem {
    id: string;
    productId: string | null; // 👈 AJOUT
    product: Product | null; // 👈 CORRECTION — optionnel désormais
    quantity: number;
    size: string;
    price: number; // 👈 AJOUT — prix appliqué dans le panier (remisé ou non)
    offerId?: string | null;
    offerTitle?: string | null; // 👈 AJOUT — snapshot nom de l'offre (si pas de produit)
    offerImage?: string | null; // 👈 AJOUT — snapshot image de l'offre (si pas de produit)
}

// 👇 CORRECTION — product optionnel, ajout offerId/offerTitle/offerImage
// pour pouvoir afficher un item "offre libre" dans CartItem.tsx
export type CartItemProps = {
    item: {
        id: string;
        product: { name: string; price: number; images: string[] } | null;
        quantity: number;
        size: string;
        price: number;
        offerId?: string | null;
        offerTitle?: string | null;
        offerImage?: string | null;
    };
    onRemove?: () => void;
    onUpdateQuantity?: (newQty: number) => void;
};

export type CategoryItemProps = {
  item: { id: string | number; name?: string; nameKey?: string; icon: string };
  isSelected?: boolean;
  onPress?: () => void;
};
export type HeaderProps = {
    title?: string;
    showBack?: boolean;
    showSearch?: boolean;
    showCart?: boolean;
    showMenu?: boolean;
    showLogo?: boolean;
    rightAction?: ReactNode;
     onMenuPress?: () => void; 
};

export interface Address {
    _id: string;
    type: "Home" | "Work" | "Other";
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
    createdAt: string;
}

export interface OrderItem {
    product: Product | string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
    size?: string;
}

export interface Order {
    _id: string;
    user: User | string;
    orderNumber: string;
    items: OrderItem[];
    shippingAddress: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    paymentMethod: string;
    paymentStatus: "pending" | "paid" | "failed" | "refunded";
    orderStatus: "placed" | "processing" | "shipped" | "delivered" | "cancelled";
    subtotal: number;
    shippingCost: number;
    tax: number;
    totalAmount: number;
    notes?: string;
    deliveredAt?: string;
    createdAt: string;
}

export type WishlistContextType = {
  wishlist: Product[];
  loading: boolean;
  toggleWishlist: (product: Product) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  fetchWishlist: () => Promise<void>; // ← ajouter
};