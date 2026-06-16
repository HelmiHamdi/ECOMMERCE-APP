import express from "express";
import { getMyProfile,  savePushToken,  updateMyProfile } from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const UserRouter = express.Router();

UserRouter.get("/me", protect, getMyProfile);
UserRouter.put("/me", protect, upload.single("image"), updateMyProfile);
UserRouter.post("/push-token", protect, savePushToken);
export default UserRouter;