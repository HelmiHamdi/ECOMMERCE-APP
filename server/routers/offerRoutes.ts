import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import upload from "../middleware/upload.js"; 
import {
  getOffers,
  getAllOffers,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer,
} from "../controllers/offerController.js";

const OfferRouter = express.Router();


OfferRouter.get("/admin/all", protect, authorize("admin"), getAllOffers);

OfferRouter.get("/", getOffers);
OfferRouter.get("/:id", getOffer);


OfferRouter.post("/", protect, authorize("admin"), upload.array("images", 10), createOffer);
OfferRouter.put("/:id", protect, authorize("admin"),  upload.array("images", 10), updateOffer);

OfferRouter.delete("/:id", protect, authorize("admin"), deleteOffer);

export default OfferRouter;