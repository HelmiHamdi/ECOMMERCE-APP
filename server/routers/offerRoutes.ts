import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import upload from "../middleware/upload.js"; // 👈 votre middleware multer existant (memoryStorage)
import {
  getOffers,
  getAllOffers,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer,
} from "../controllers/offerController.js";

const OfferRouter = express.Router();

// ⚠️ Route admin AVANT ":id" pour éviter que "admin" soit interprété comme un id
OfferRouter.get("/admin/all", protect, authorize("admin"), getAllOffers);

OfferRouter.get("/", getOffers);
OfferRouter.get("/:id", getOffer);

// 👇 AJOUT — upload.single("image") parse le multipart/form-data envoyé par
// l'app (champ "image"), remplit req.body avec les autres champs texte, et
// place le fichier en mémoire dans req.file.buffer (envoyé ensuite à Cloudinary
// dans le controller).
OfferRouter.post("/", protect, authorize("admin"), upload.array("images", 10), createOffer);
OfferRouter.put("/:id", protect, authorize("admin"),  upload.array("images", 10), updateOffer);

OfferRouter.delete("/:id", protect, authorize("admin"), deleteOffer);

export default OfferRouter;