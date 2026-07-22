export const COLORS = {
  primary: "#111111",
  secondary: "#666666",
  background: "#FFFFFF",
  surface: "#F7F7F7",
  accent: "#FF4C3B",
  border: "#EEEEEE",
  error: "#FF4444",
};


export const CATEGORIES = [
  { id: 1, nameKey: "men", icon: "man-outline" },
  { id: 2, nameKey: "women", icon: "woman-outline" },
  { id: 3, nameKey: "kids", icon: "happy-outline" },
  { id: 4, nameKey: "shoes", icon: "footsteps-outline" },
  { id: 5, nameKey: "bag", icon: "briefcase-outline" },
  { id: 6, nameKey: "makeup", icon: "color-palette-outline" },
  { id: 7, nameKey: "accessories", icon: "watch-outline" },
  { id: 8, nameKey: "baby", icon: "nutrition-outline" },
  { id: 9, nameKey: "parfum", icon: "flask-outline" },       
  { id: 10, nameKey: "other", icon: "grid-outline" },
];


export const SIZE_REQUIRED_CATEGORIES = ["men", "women", "kids", "shoes"];

export const PROFILE_MENU = [
  { id: 1, titleKey: "myOrders", icon: "receipt-outline", route: "/orders" },
  { id: 2, titleKey: "shippingAddresses", icon: "location-outline", route: "/addresses" },
  { id: 4, titleKey: "myReviews", icon: "star-outline", route: "/my-review" },
  { id: 5, titleKey: "settings", icon: "settings-outline", route: "/settings" },
];

export const getStatusColor = (status: string) => {
  switch (status) {
    case "placed":
      return "bg-yellow-50 text-yellow-900";
    case "processing":
      return "bg-indigo-50 text-indigo-900";
    case "shipped":
      return "bg-purple-50 text-purple-900";
    case "delivered":
      return "bg-green-50 text-green-900";
    case "cancelled":
      return "bg-red-50 text-red-900";
    default:
      return "bg-gray-50 text-gray-900";
  }
};


export const PRODUCT_STATUSES = {
  in_stock: {
    key: "in_stock",
    labelKey: "statusInStock",
    defaultLabel: "En stock",
    color: "#16A34A",       
    bgColor: "#DCFCE7",      
    icon: "checkmark-circle" as const,
    canAddToCart: true,
    buttonLabelKey: "addToCart",
    buttonDefaultLabel: "Ajouter au panier",
  },
  incoming: {
    key: "incoming",
    labelKey: "statusIncoming",
    defaultLabel: "En arrivage",
    color: "#2563EB",       
    bgColor: "#DBEAFE",
    icon: "boat-outline" as const,
    canAddToCart: false,
    buttonLabelKey: "notifyWhenAvailable",
    buttonDefaultLabel: "Me prévenir",
  },
  out_of_stock: {
    key: "out_of_stock",
    labelKey: "statusOutOfStock",
    defaultLabel: "Épuisé",
    color: "#DC2626",        
    bgColor: "#F3F4F6",    
    icon: "close-circle" as const,
    canAddToCart: false,
    buttonLabelKey: "outOfStockButton",
    buttonDefaultLabel: "Épuisé",
  },
  on_order_48h: {
    key: "on_order_48h",
    labelKey: "statusOnOrder48h",
    defaultLabel: "Sur commande (48h)",
    color: "#EA580C",        
    bgColor: "#FFEDD5",
    icon: "time-outline" as const,
    canAddToCart: true,
    buttonLabelKey: "orderNow48h",
    buttonDefaultLabel: "Commander (48h)",
  },
} as const;

export type ProductStatusKey = keyof typeof PRODUCT_STATUSES;
export const PRODUCT_STATUS_LIST = Object.values(PRODUCT_STATUSES);


export function getStatusConfig(status?: string | null) {
  if (status && status in PRODUCT_STATUSES) {
    return PRODUCT_STATUSES[status as ProductStatusKey];
  }
  return PRODUCT_STATUSES.in_stock;
}