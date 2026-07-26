export const getCategoryLabel = (category?: string, t?: (k: string) => string | undefined): string | null => {
  if (!category) return null;
  const key = `category_${category}`;
  const fallbacks: Record<string, string> = {
    men: "Homme",
    women: "Femme",
    kids: "Enfant",
    shoes: "Chaussures",
    bag: "Sac",
    makeup: "Maquillage",
    accessories: "Accessoires",
    baby: "Bébé",
    parfum: "Parfum",
    other: "Autre",
  };
  return t?.(key) ?? fallbacks[category] ?? category;
};

export const getStockStatusLabel = (status?: string, t?: (k: string) => string | undefined): string | null => {
  if (!status) return null;
  const key = `stockStatus_${status}`;
  const fallbacks: Record<string, string> = {
    in_stock: "En stock",
    incoming: "Arrivage",
    out_of_stock: "Rupture de stock",
    on_order_48h: "Sur commande 48h",
  };
  return t?.(key) ?? fallbacks[status] ?? status;
};

export const getStockStatusColor = (status?: string): { color: string; bg: string } => {
  switch (status) {
    case "in_stock": return { color: "#10B981", bg: "#D1FAE5" };
    case "incoming": return { color: "#3B82F6", bg: "#DBEAFE" };
    case "out_of_stock": return { color: "#EF4444", bg: "#FEE2E2" };
    case "on_order_48h": return { color: "#F59E0B", bg: "#FEF3C7" };
    default: return { color: "#6B7280", bg: "#F3F4F6" };
  }
};