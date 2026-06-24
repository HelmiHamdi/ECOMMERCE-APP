import express from "express";
import { authorize, protect } from "../middleware/auth.js";
import {
  createOrder,
  getAllOrders,
  getOrder,
  getOrderInvoice,
  getOrders,
  updateOrderStatus,
  getInvoiceLink,
  downloadInvoicePublic,
} from "../controllers/orderController.js";

const OrderRouter = express.Router();

// ⚠️ Route publique EN PREMIER — pas de protect (pas de Clerk)
OrderRouter.get("/:id/invoice/download", downloadInvoicePublic);

// Routes protégées par Clerk
OrderRouter.get("/:id/invoice/link", protect, getInvoiceLink);
OrderRouter.get("/:id/invoice", protect, getOrderInvoice);
OrderRouter.get("/", protect, getOrders);
OrderRouter.get("/:id", protect, getOrder);
OrderRouter.post("/", protect, createOrder);
OrderRouter.put("/:id/status", protect, authorize("admin"), updateOrderStatus);
OrderRouter.get("/admin/all", protect, authorize("admin"), getAllOrders);

export default OrderRouter;
