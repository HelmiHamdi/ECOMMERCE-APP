import "dotenv/config";
import connectDB from "../config/db.js";
import { clerkClient } from "@clerk/express";
import User from "../models/User.js";

interface SeedUser {
  firstName: string;
  lastName: string;
  phone: string;
  image: string;
}


const usersToSeed: SeedUser[] = [
  { firstName: "Helmi", lastName: "Hamdi", phone: "+21620111222", image: "https://i.pravatar.cc/300?img=1" },
  { firstName: "Wassim", lastName: "Nazi", phone: "+21622333444", image: "https://i.pravatar.cc/300?img=2" },
  { firstName: "Youssef", lastName: "Trabelsi", phone: "+21624555666", image: "https://i.pravatar.cc/300?img=3" },
  { firstName: "Amine", lastName: "Gharbi", phone: "+21626777888", image: "https://i.pravatar.cc/300?img=4" },
  { firstName: "Sarra", lastName: "BenSalah", phone: "+21628999000", image: "https://i.pravatar.cc/300?img=5" },
  { firstName: "Nour", lastName: "Chaieb", phone: "+21629111222", image: "https://i.pravatar.cc/300?img=6" },
  { firstName: "Karim", lastName: "Bouazizi", phone: "+21621333444", image: "https://i.pravatar.cc/300?img=7" },
  { firstName: "Rania", lastName: "Kefi", phone: "+21623555666", image: "https://i.pravatar.cc/300?img=8" },
  { firstName: "Mehdi", lastName: "Sassi", phone: "+21625777888", image: "https://i.pravatar.cc/300?img=9" },
  { firstName: "Ines", lastName: "Jaziri", phone: "+21627999000", image: "https://i.pravatar.cc/300?img=10" },
  { firstName: "Anis", lastName: "Belhadj", phone: "+21620222333", image: "https://i.pravatar.cc/300?img=11" },
  { firstName: "Salma", lastName: "Ferjani", phone: "+21622444555", image: "https://i.pravatar.cc/300?img=12" },
  { firstName: "Bilel", lastName: "Ayari", phone: "+21624666777", image: "https://i.pravatar.cc/300?img=13" },
  { firstName: "Yassine", lastName: "Cherni", phone: "+21626888999", image: "https://i.pravatar.cc/300?img=14" },
  { firstName: "Ahmed", lastName: "Mabrouk", phone: "+21628000111", image: "https://i.pravatar.cc/300?img=15" },
  { firstName: "Emna", lastName: "Toumi", phone: "+21629222333", image: "https://i.pravatar.cc/300?img=16" },
  { firstName: "Sami", lastName: "Guesmi", phone: "+21621444555", image: "https://i.pravatar.cc/300?img=17" },
  { firstName: "Rim", lastName: "Khelifi", phone: "+21623666777", image: "https://i.pravatar.cc/300?img=18" },
  { firstName: "Hamza", lastName: "Souissi", phone: "+21625888999", image: "https://i.pravatar.cc/300?img=19" },
  { firstName: "Nada", lastName: "Rekik", phone: "+21627000111", image: "https://i.pravatar.cc/300?img=20" },
];

function buildEmail(firstName: string, lastName: string) {
  return `${firstName}.${lastName}@example.com`.toLowerCase();
}

function buildPassword(firstName: string, lastName: string) {
  
  return `${firstName}${lastName}999`;
}

async function seedUsers() {
  await connectDB();

  let success = 0;
  let failed = 0;

  for (const u of usersToSeed) {
    const email = buildEmail(u.firstName, u.lastName);
    const password = buildPassword(u.firstName, u.lastName);

    try {
      // 1. Création côté Clerk (gère l'authentification / le mot de passe)
      const clerkUser = await clerkClient.users.createUser({
        emailAddress: [email],
        password,
        firstName: u.firstName,
        lastName: u.lastName,
      });

      // 2. Création/complément côté Mongo (phone + image ne viennent pas du webhook Clerk)
      await User.findOneAndUpdate(
        { clerkId: clerkUser.id },
        {
          clerkId: clerkUser.id,
          name: `${u.firstName} ${u.lastName}`,
          email,
          phone: u.phone,
          image: u.image,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      console.log(`✅ ${email}  |  mdp: ${password}`);
      success++;
    } catch (err: any) {
      console.error(
        `❌ Échec pour ${email}:`,
        err?.errors?.[0]?.message ?? err?.message ?? err
      );
      failed++;
    }
  }

  console.log(`\n🎉 Terminé — ${success} créés, ${failed} échoués sur ${usersToSeed.length}`);
  process.exit(0);
}

seedUsers();