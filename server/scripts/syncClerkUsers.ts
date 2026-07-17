
import { clerkClient } from "@clerk/express";
import mongoose from "mongoose";
import User from "../models/User.js";

const MONGO_URI = process.env.MONGO_URI as string;

async function syncUsers() {
  await mongoose.connect(MONGO_URI);

  const { data: clerkUsers } = await clerkClient.users.getUserList({ limit: 100 });

  for (const cu of clerkUsers) {
    const email = cu.emailAddresses[0]?.emailAddress ?? "";
    const name = `${cu.firstName ?? ""} ${cu.lastName ?? ""}`.trim();

    const existing = await User.findOne({ clerkId: cu.id });
    if (!existing) {
      await User.create({
        clerkId: cu.id,
        email,
        name,
        image: cu.imageUrl ?? "",
      });
      console.log(`✅ Rattrapé: ${email}`);
    } else {
      console.log(`↷ Déjà présent: ${email}`);
    }
  }

  console.log("Synchronisation terminée.");
  await mongoose.disconnect();
}

syncUsers();