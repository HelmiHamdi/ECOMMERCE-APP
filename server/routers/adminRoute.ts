import express from "express";
import { authorize, protect } from "../middleware/auth.js";
import {
  getAllUsers,
  getDashboardStats,
  updateUserRole,
} from "../controllers/adminController.js";

const AdminRouter = express.Router();

AdminRouter.get("/stats", protect, authorize("admin"), getDashboardStats);
AdminRouter.get("/users", protect, authorize("admin"), getAllUsers);
AdminRouter.patch("/users/:id/role", protect, authorize("admin"), updateUserRole);

export default AdminRouter;