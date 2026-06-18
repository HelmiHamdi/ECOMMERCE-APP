import { Request, Response } from "express";
import Product from "../models/Products.js";
import Order from "../models/Order.js";
import { OPENROUTER_API_KEY, OPENROUTER_URL, CHAT_MODEL } from "../config/openrouter.js";

const SHIPPING_COST = "2 TND";
const SHIPPING_DELAY = "2 à 5 jours ouvrables";
const SHIPPING_ZONES = "Toute la Tunisie";
const PAYMENT_METHODS = "Paiement à la livraison (Cash on Delivery), et paiement par carte via Stripe";
const RETURN_POLICY = "Retours et échanges acceptés sous 7 jours après réception, produit non porté et avec étiquette d'origine";
const CONTACT_EMAIL = "helmihamdi977@gmail.com";

const CATEGORY_LABELS: Record<string, string> = {
  men: "Homme",
  women: "Femme",
  kids: "Enfant",
  shoes: "Chaussures",
  bag: "Sacs",
  other: "Autres",
};

let shopContextCache: { data: string; expiresAt: number } | null = null;

const buildShopContext = async (): Promise<string> => {
  if (shopContextCache && shopContextCache.expiresAt > Date.now()) {
    return shopContextCache.data;
  }

  // 6 requêtes en parallèle au lieu de séquentielles
  const [
    totalProducts,
    categoryStats,
    priceStats,
    allSizes,
    outOfStockCount,
    featuredProducts,
  ] = await Promise.all([
    Product.countDocuments({ isActive: true }),
    Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          sizes: { $addToSet: "$sizes" },
          inStock: { $sum: { $cond: [{ $gt: ["$stock", 0] }, 1, 0] } },
        },
      },
    ]),
    Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          avgPrice: { $avg: "$price" },
        },
      },
    ]),
    Product.distinct("sizes", { isActive: true }),
    Product.countDocuments({ isActive: true, stock: 0 }),
    Product.find({ isActive: true, isFeatured: true })
      .limit(6)
      .select("name price category sizes stock")
      .lean(),
  ]);

  const stats = priceStats[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 };

  const categoryLines = categoryStats
    .map((c) => {
      const sizesFlat = [...new Set((c.sizes || []).flat())].filter(Boolean);
      const label = CATEGORY_LABELS[c._id] || c._id;
      return `  - ${label}: ${c.count} produit(s), prix de ${c.minPrice} à ${c.maxPrice} TND, tailles: ${
        sizesFlat.join(", ") || "N/A"
      }, ${c.inStock} en stock`;
    })
    .join("\n");

  const featuredLines = featuredProducts
    .map(
      (p: any) =>
        `  - ${p.name} (${CATEGORY_LABELS[p.category] || p.category}) - ${p.price} TND - tailles: ${
          (p.sizes || []).join(", ") || "N/A"
        } - ${p.stock > 0 ? `${p.stock} en stock` : "rupture de stock"}`
    )
    .join("\n");

  const context = `
=== CATALOGUE DE LA BOUTIQUE (Ines Shop) ===
Nombre total de produits actifs: ${totalProducts}
Produits en rupture de stock: ${outOfStockCount}
Fourchette de prix générale: de ${stats.minPrice} à ${stats.maxPrice} TND (moyenne ${Math.round(stats.avgPrice)} TND)
Toutes les tailles disponibles dans le catalogue: ${allSizes.join(", ") || "N/A"}

Détail par catégorie:
${categoryLines || "  Aucune catégorie disponible"}

Produits mis en avant (featured):
${featuredLines || "  Aucun produit mis en avant"}

=== LIVRAISON ===
- Frais de livraison: ${SHIPPING_COST}
- Délai de livraison estimé: ${SHIPPING_DELAY}
- Zones desservies: ${SHIPPING_ZONES}

=== PAIEMENT ===
- Moyens de paiement acceptés: ${PAYMENT_METHODS}

=== RETOURS ET ÉCHANGES ===
- ${RETURN_POLICY}

=== CONTACT ===
- Pour toute question non résolue, le client peut écrire à: ${CONTACT_EMAIL}

Si le client demande des détails précis sur un produit spécifique non listé ci-dessus (recherche par nom exact, mot-clé précis), utilise la fonction de recherche de produits pour obtenir des informations à jour avant de répondre.
`.trim();

  shopContextCache = { data: context, expiresAt: Date.now() + 10 * 60 * 1000 };
  return context;
};

const SHOP_SYSTEM_PROMPT_BASE = `Tu es l'assistant virtuel de la boutique "Ines Shop", spécialisée dans la vente de vêtements, chaussures et accessoires en ligne.
Ton rôle est d'aider les clients à comprendre ce que propose la boutique : catégories de produits, prix, tailles disponibles, stock, livraison, paiement, retours, et état de leurs commandes.
Réponds uniquement aux questions liées à la boutique. Si une question est hors sujet (politique, météo, sujets non liés à la boutique), réponds poliment que tu ne peux aider que sur les sujets liés à la boutique.
Sois concis, amical et professionnel. Réponds dans la langue utilisée par le client (français, anglais ou arabe).
N'invente jamais de prix, de stock, de produits, de délais ou de politiques : utilise uniquement les informations fournies ci-dessous ou la fonction de recherche.`;

const PRODUCT_SEARCH_TOOL = {
  type: "function",
  function: {
    name: "search_products",
    description:
      "Recherche des produits dans la boutique par nom, catégorie ou mot-clé. Retourne nom, prix, tailles, stock et catégorie.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Mot-clé de recherche (nom de produit, catégorie, type de vêtement, etc.)",
        },
      },
      required: ["query"],
    },
  },
};

const searchProducts = async (query: string) => {
  const products = await Product.find({
    isActive: true,
    $or: [
      { name: { $regex: query, $options: "i" } },
      { category: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ],
  })
    .limit(8)
    .select("name price category sizes stock description")
    .lean();

  if (products.length === 0) {
    return "Aucun produit trouvé pour cette recherche.";
  }

  return products
    .map(
      (p: any) =>
        `- ${p.name} | Catégorie: ${CATEGORY_LABELS[p.category] || p.category} | Prix: ${p.price} TND | Tailles: ${
          (p.sizes || []).join(", ") || "N/A"
        } | Stock: ${p.stock > 0 ? `${p.stock} disponible(s)` : "Rupture de stock"}`
    )
    .join("\n");
};

const fetchOpenRouter = async (body: object): Promise<any> => {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("OpenRouter error:", errText);
    throw new Error("Chat service unavailable");
  }

  return response.json();
};

export const sendChatMessage = async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    // shopContext + recentOrders en parallèle
    const [shopContext, recentOrders] = await Promise.all([
      buildShopContext(),
      req.user
        ? Order.find({ user: req.user._id })
            .sort("-createdAt")
            .limit(3)
            .select("orderNumber orderStatus totalAmount createdAt")
            .lean()
        : Promise.resolve([]),
    ]);

    let userContext = "";
    if (recentOrders.length > 0) {
      userContext = `\n\n=== COMMANDES RÉCENTES DU CLIENT ===\n${(recentOrders as any[])
        .map(
          (o) =>
            `- ${o.orderNumber}: statut "${o.orderStatus}", total ${o.totalAmount} TND`
        )
        .join("\n")}`;
    }

    const systemContent = `${SHOP_SYSTEM_PROMPT_BASE}\n\n${shopContext}${userContext}`;

    let messages: any[] = [
      { role: "system", content: systemContent },
      ...(Array.isArray(history) ? history.slice(-10) : []),
      { role: "user", content: message },
    ];

    let data = await fetchOpenRouter({
      model: CHAT_MODEL,
      messages,
      tools: [PRODUCT_SEARCH_TOOL],
      max_tokens: 600,
    });

    let choice = data?.choices?.[0];

    // Tool call : recherche produit demandée par le modèle
    if (choice?.message?.tool_calls?.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments || "{}");
      const searchResult = await searchProducts(args.query || "");

      messages.push(choice.message);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: searchResult,
      });

      data = await fetchOpenRouter({
        model: CHAT_MODEL,
        messages,
        max_tokens: 600,
      });

      choice = data?.choices?.[0];
    }

    const reply = choice?.message?.content ?? "";
    res.json({ success: true, reply });
  } catch (error: any) {
    console.error("CHAT ERROR:", error);
    const isServiceError = error.message === "Chat service unavailable";
    res
      .status(isServiceError ? 502 : 500)
      .json({ success: false, message: error.message });
  }
};

export const searchProductsForChat = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    const products = await Product.find({
      isActive: true,
      name: { $regex: query as string, $options: "i" },
    })
      .limit(5)
      .select("name price images sizes stock")
      .lean();

    res.json({ success: true, data: products });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};