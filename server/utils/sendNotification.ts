import User from "../models/User.js";

export const sendNewProductNotification = async (
  productName: string,
  productId: string
) => {
  try {
    const users = await User.find({ expoPushToken: { $ne: null } });
    const tokens = users
      .map((u: any) => u.expoPushToken)
      .filter(Boolean) as string[];

    if (tokens.length === 0) return;

    const messages = tokens.map((token) => ({
      to: token,
      sound: "default",
      title: "🛍️ Nouveau produit !",
      body: `${productName} vient d'être ajouté !`,
      data: { productId },
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    console.log("✅ Notifications envoyées");
  } catch (error) {
    console.error("❌ Erreur notification:", error);
  }
};