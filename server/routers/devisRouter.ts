import express from "express";
import {
  createDevis,
  getMyDevis,
  getAllDevis,
  getDevisById,
  updateDevisStatus,
  deleteDevis,
} from "../controllers/devisController.js";
import { authorize, protect } from "../middleware/auth.js";

const DevisRouter = express.Router();

DevisRouter.post("/", protect, createDevis);
DevisRouter.get("/mine", protect, getMyDevis);


DevisRouter.get("/", protect, authorize("admin"), getAllDevis);
DevisRouter.get("/:id", protect, authorize("admin"), getDevisById);
DevisRouter.put("/:id", protect, authorize("admin"), updateDevisStatus);
DevisRouter.delete("/:id", protect, authorize("admin"), deleteDevis);

export default DevisRouter;