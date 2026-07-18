import express from "express";
import {
  getActiveGif,
  getAllGifsAdmin,
  getGif,
  createGif,
  updateGif,
  activateGif,
  deactivateGif,
  deleteGif,
} from "../controllers/gifController.js";
import upload from "../middleware/upload.js";
import { authorize, protect } from "../middleware/auth.js";

const GifRouter = express.Router();

GifRouter.get("/", getActiveGif);

GifRouter.get("/all", protect, authorize("admin"), getAllGifsAdmin);
GifRouter.get("/:id", protect, authorize("admin"), getGif);
GifRouter.post("/", upload.single("image"), protect, authorize("admin"), createGif);
GifRouter.put("/:id", upload.single("image"), protect, authorize("admin"), updateGif);
GifRouter.patch("/:id/activate", protect, authorize("admin"), activateGif);
GifRouter.patch("/:id/deactivate", protect, authorize("admin"), deactivateGif);
GifRouter.delete("/:id", protect, authorize("admin"), deleteGif);

export default GifRouter;