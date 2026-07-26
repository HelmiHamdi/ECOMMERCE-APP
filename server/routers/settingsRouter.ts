import express from "express";
import { getPublicSettings, updateSettings } from "../controllers/settingsController.js";
import { authorize, protect } from "../middleware/auth.js";

const SettingsRouter = express.Router();

SettingsRouter.get("/", getPublicSettings);
SettingsRouter.put("/", protect, authorize("admin"), updateSettings);

export default SettingsRouter;