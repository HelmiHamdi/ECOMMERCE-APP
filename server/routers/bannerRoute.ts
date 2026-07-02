import express from "express";
import {
  getBanners,
  getAllBannersAdmin,
  getBanner,
  createBanner,
  updateBanner,
  deleteBanner,
} from "../controllers/bannerController.js";
import upload from "../middleware/upload.js";
import { authorize, protect } from "../middleware/auth.js";

const BannerRouter = express.Router();


BannerRouter.get("/", getBanners);


BannerRouter.get("/all", protect, authorize("admin"), getAllBannersAdmin);
BannerRouter.get("/:id", protect, authorize("admin"), getBanner);
BannerRouter.post("/", upload.single("image"), protect, authorize("admin"), createBanner);
BannerRouter.put("/:id", upload.single("image"), protect, authorize("admin"), updateBanner);
BannerRouter.delete("/:id", protect, authorize("admin"), deleteBanner);

export default BannerRouter;