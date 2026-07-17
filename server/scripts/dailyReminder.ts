import cron from "node-cron";
import { sendDailyReminderNotification } from "../utils/sendNotification.js";

export const scheduleDailyReminder = () => {
  cron.schedule("0 18 * * *", async () => {
    console.log("⏰ Envoi du rappel quotidien...");
    await sendDailyReminderNotification();
    console.log("✅ Rappel quotidien envoyé.");
  });

  console.log("📅 Cron rappel quotidien planifié (tous les jours à 18h00).");
};