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
  product?: mongoose.Types.ObjectId | null;
  quantity: number;
  price: number;
  size?: string;
  offerId?: mongoose.Types.ObjectId | null;
  offerTitle?: string | null;   
  offerImage?: string | null;   
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
  product?: Types.ObjectId | null; 
  name: string;
  image: string | null;
  quantity: number;
  price: number;
  size?: string;
  offerId?: Types.ObjectId | null;  
  offerTitle?: string | null;      
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
  
  category: "men" | "women" | "kids" | "shoes" | "bag" | "makeup" | "accessories" | "baby" | "parfum" | "other";
  status: "in_stock" | "incoming" | "out_of_stock" | "on_order_48h"; 
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


export interface INotification extends Document {
  user: Types.ObjectId;
  title: string;
  body: string;
  type: "new_product" | "daily_reminder" | "order" | "general" | "support" | "offer"| "devis";
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
export interface IConversation extends Document {
  participants: Types.ObjectId[]; 
  isGroup: boolean;
  name?: string; 
  lastMessage?: string;
  lastMessageType?: "text" | "image" | "video" | "file" | "audio" | "call";
  lastMessageAt?: Date;
  lastMessageSender?: Types.ObjectId;

  unreadCount: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}
export type MessageType = "text" | "image" | "video" | "file" | "audio" | "call";
export type CallStatus = "missed" | "answered" | "declined" | "ended";
export type CallKind = "audio" | "video";

export interface IMessage extends Document {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  type: MessageType;
 
  content?: string;
 
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSize?: number;
  thumbnailUrl?: string;
 
  callKind?: CallKind;
  callStatus?: CallStatus;
  callDurationSec?: number;
 
  // ✅ NOUVEAU
  edited?: boolean;
  editedAt?: Date;
  isDeleted?: boolean;
 
  readBy: Types.ObjectId[];
  deletedFor: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}