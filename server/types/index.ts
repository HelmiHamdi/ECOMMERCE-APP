import mongoose, { Document, Types } from "mongoose";

export interface IAddress extends Document {
  user: Types.ObjectId;
  type: "Home" | "Work" | "Other";
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface ICartItem {
  product?: mongoose.Types.ObjectId | null; // 👈 optionnel — null pour une offre libre
  quantity: number;
  price: number;
  size?: string;
  offerId?: mongoose.Types.ObjectId | null;
  offerTitle?: string | null;   // 👈 snapshot pour offre libre
  offerImage?: string | null;   // 👈 snapshot pour offre libre
}
export interface ICart extends Document {
  user: Types.ObjectId;
  items: ICartItem[];
  totalAmount: number;
  calculateTotal(): number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderItem {
  product?: Types.ObjectId | null; // 👈 CORRECTION — optionnel, null pour une offre libre
  name: string;
  image: string | null;
  quantity: number;
  price: number;
  size?: string;
  offerId?: Types.ObjectId | null;   // 👈 AJOUT — traçabilité de l'offre appliquée
  offerTitle?: string | null;        // 👈 AJOUT — utile si offre libre (pas de produit)
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  orderNumber: string;
  items: IOrderItem[];
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: "cash" | "stripe";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentIntentId?: string;
  orderStatus: "placed" | "processing" | "shipped" | "delivered" | "cancelled";
  subtotal: number;
  shippingCost: number;
  tax: number;
  totalAmount: number;
  notes?: string;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  hasActiveOffer?: boolean;
  discountPercentage?: number;
  finalPrice?: number;
  offerId?: string;
  images: string[];
  sizes: string[];
  video?: string;
  category: "men" | "women" | "kids" | "shoes" | "bag" | "makeup" | "accessories" | "baby" | "other"; // 👈 AJOUT
  stock: number;
  ratings: {
    average: number;
    count: number;
  };
  isFeatured: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser extends Document {
  name?: string;
  email?: string;
  clerkId?: string;
  image?: string;
  expoPushToken?: string;
  phone: string;
  wishlist: Types.ObjectId[];
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

export interface IWishlist extends Document {
  user: Types.ObjectId;
  products: Types.ObjectId[];
  createdAt: Date;
}

// 👇 AJOUT du type "support" pour les notifications liées aux tickets
export interface INotification extends Document {
  user: Types.ObjectId;
  title: string;
  body: string;
  type: "new_product" | "daily_reminder" | "order" | "general" | "support";
  data?: Record<string, any>;
  isRead: boolean;
  createdAt?: Date;
}

 export interface ISupportTicket extends Document {
  user: Types.ObjectId;
  subject: string;
  message: string;
  category: "order" | "return" | "defective" | "delivery" | "payment" | "other";
  orderNumber?: string;
  priority: "low" | "normal" | "high";
   status: "open" | "in_progress" | "closed";
  reply?: string;
   createdAt: Date;
   updatedAt: Date;
 }

export interface INewsletter extends Document {
  email: string;
  subscribedAt: Date;
  active: boolean;
}
export interface IBanner extends Document {
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
  order: number;
  isActive: boolean;
}
export interface IGif extends Document {
  title?: string;
  image: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}