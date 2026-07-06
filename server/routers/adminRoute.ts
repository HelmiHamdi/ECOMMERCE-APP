import express from "express"
import { authorize, protect } from "../middleware/auth.js"
import { getAllUsers, getDashboardStats } from "../controllers/adminController.js"


const AdminRouter = express.Router()

AdminRouter.get('/stats',protect,authorize('admin'),getDashboardStats);
AdminRouter.get("/users", protect, getAllUsers);

export default AdminRouter;