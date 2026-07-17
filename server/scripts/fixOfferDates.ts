

import mongoose from "mongoose";
import Offer from "../models/Offer.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://shop:shop123@cluster0.1xza3nq.mongodb.net/shop-mobile";

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connecté à MongoDB");

  const offers = await Offer.find();
  console.log(`${offers.length} offre(s) trouvée(s)`);

  let updated = 0;
  for (const offer of offers) {
    const start = new Date(offer.startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(offer.endDate);
    end.setHours(23, 59, 59, 999);

    const needsUpdate =
      offer.startDate.getTime() !== start.getTime() ||
      offer.endDate.getTime() !== end.getTime();

    if (needsUpdate) {
      offer.startDate = start;
      offer.endDate = end;
      // validateBeforeSave: false pour éviter de retrigger inutilement
      // le hook (les valeurs sont déjà normalisées ici)
      await offer.save({ validateBeforeSave: false });
      updated++;
      console.log(`✔ Offre "${offer.title}" corrigée`);
    }
  }

  console.log(`Terminé : ${updated} offre(s) mise(s) à jour sur ${offers.length}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Erreur pendant la migration :", err);
  process.exit(1);
});