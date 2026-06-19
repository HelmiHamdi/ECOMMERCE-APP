import User from "../models/User.js";
import Notification from "../models/Notification.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_BATCH_SIZE = 100; // Expo recommande des lots de 100 max par requête

type NotificationType = "new_product" | "daily_reminder" | "order" | "general";

interface PushMessage {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Envoie un lot de push notifications via l'API Expo.
 * Ne lève jamais d'exception bloquante : log les erreurs et continue.
 */
const sendExpoPushBatch = async (messages: PushMessage[]) => {
  if (messages.length === 0) return;
  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.error("EXPO PUSH BATCH ERROR:", error);
  }
};

/**
 * Envoie une notification push à un utilisateur précis (token unique)
 * sans toucher à l'historique en DB. Utile pour les notifs ciblées
 * (ex: statut de commande pour un seul user).
 */
export const savePushToken = async (
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
) => {
  if (!expoPushToken) return;
  await sendExpoPushBatch([
    { to: expoPushToken, sound: "default", title, body, data: data || {} },
  ]);
};

/**
 * Coeur du système : envoie une notification à TOUS les utilisateurs
 * qui ont un expoPushToken enregistré, ET sauvegarde une entrée en DB
 * pour CHAQUE utilisateur (y compris ceux sans push token, pour qu'ils
 * la retrouvent dans l'historique interne de l'app).
 */
export const broadcastNotification = async (
  title: string,
  body: string,
  type: NotificationType = "general",
  data?: Record<string, any>
) => {
  try {
    const users = await User.find({}, "_id expoPushToken");
    if (users.length === 0) return;

    // 1. Historique en DB pour tous les users (lu dans l'écran "notifications")
    const notifDocs = users.map((u) => ({
      user: u._id,
      title,
      body,
      type,
      data: data || {},
    }));
    await Notification.insertMany(notifDocs);

    // 2. Push réel uniquement pour ceux qui ont un token, par lots de 100
    const tokens = users
      .map((u) => u.expoPushToken)
      .filter((t): t is string => !!t);

    const messages: PushMessage[] = tokens.map((to) => ({
      to,
      sound: "default",
      title,
      body,
      data: data || {},
    }));

    for (let i = 0; i < messages.length; i += EXPO_PUSH_BATCH_SIZE) {
      const batch = messages.slice(i, i + EXPO_PUSH_BATCH_SIZE);
      await sendExpoPushBatch(batch);
    }
  } catch (error) {
    console.error("BROADCAST NOTIFICATION ERROR:", error);
  }
};

/**
 * Notification spécifique : nouveau produit ajouté par l'admin.
 * Appelée depuis productController.createProduct.
 */
export const sendNewProductNotification = async (
  productName: string,
  productId: string
) => {
  await broadcastNotification(
    "Nouveau produit disponible 🛍️",
    `${productName} vient d'être ajouté. Découvre-le maintenant !`,
    "new_product",
    { productId }
  );
};

/**
 * Rappel quotidien automatique, déclenché par le cron job.
 */
export const sendDailyReminderNotification = async () => {
  await broadcastNotification(
    "On t'a manqué ? 👋",
    "Jette un œil aux nouveautés et offres du jour !",
    "daily_reminder"
  );
};