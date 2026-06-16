export const COLORS = {
  primary: "#111111",
  secondary: "#666666",
  background: "#FFFFFF",
  surface: "#F7F7F7",
  accent: "#FF4C3B",
  border: "#EEEEEE",
  error: "#FF4444",
};
/* categories */
export const CATEGORIES = [
  { id: 1, nameKey: "men", icon: "man-outline" },
  { id: 2, nameKey: "women", icon: "woman-outline" },
  { id: 3, nameKey: "kids", icon: "happy-outline" },
  { id: 4, nameKey: "shoes", icon: "footsteps-outline" },
  { id: 5, nameKey: "bag", icon: "briefcase-outline" },
  { id: 6, nameKey: "other", icon: "grid-outline" },
];

export const PROFILE_MENU = [
  { id: 1, titleKey: "myOrders", icon: "receipt-outline", route: "/orders" },
  { id: 2, titleKey: "shippingAddresses", icon: "location-outline", route: "/addresses" },
  { id: 4, titleKey: "myReviews", icon: "star-outline", route: "/my-review"  },
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