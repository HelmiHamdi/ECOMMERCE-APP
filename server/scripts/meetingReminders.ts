import cron from "node-cron";
import Note from "../models/Note.js";
import { sendMeetingReminderNotification } from "../utils/sendNotification.js";

const formatTimeLeft = (target: Date) => {
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return "maintenant";
  const totalMinutes = Math.round(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}j`);
  if (hours) parts.push(`${hours}h`);
  if (!days && minutes) parts.push(`${minutes}min`);
  return parts.join(" ") || "moins d'une minute";
};

const runMeetingReminders = async () => {
  try {
    const now = new Date();

    const meetings = await Note.find({
      type: "meeting",
      meetingDate: { $gte: now },
      reminderFrequency: { $in: ["daily", "hourly"] },
    }).populate("createdBy", "name");

    if (meetings.length === 0) return;

    for (const meeting of meetings) {
      const last = meeting.lastReminderSentAt;
      let shouldSend = false;

      if (meeting.reminderFrequency === "hourly") {
        shouldSend = !last || now.getTime() - new Date(last).getTime() >= 55 * 60 * 1000;
      } else if (meeting.reminderFrequency === "daily") {
        shouldSend = !last || new Date(last).toDateString() !== now.toDateString();
      }

      if (!shouldSend) continue;

      const timeLeft = formatTimeLeft(meeting.meetingDate!);
      const organizerName = (meeting.createdBy as any)?.name || "Admin";

      await sendMeetingReminderNotification(
        meeting.title,
        meeting._id.toString(),
        meeting.meetingLink,
        timeLeft,
        organizerName
      );

      meeting.lastReminderSentAt = now;
      await meeting.save();
    }
  } catch (error) {
    console.error("MEETING REMINDER ERROR:", error);
  }
};

export const scheduleMeetingReminders = () => {
  // Vérifie chaque heure pile s'il faut envoyer un rappel (horaire ou journalier)
  cron.schedule("0 * * * *", runMeetingReminders);
  console.log("Scheduler de rappels de réunion démarré");
};