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


OrderRouter.get("/:id/invoice/download", downloadInvoicePublic);

OrderRouter.get("/my", protect, getOrders);
OrderRouter.get("/admin/all", protect, authorize("admin"), getAllOrders);
OrderRouter.get("/", protect, getOrders);


OrderRouter.get("/:id/invoice/link", protect, getInvoiceLink);
OrderRouter.get("/:id/invoice", protect, getOrderInvoice);
OrderRouter.get("/:id", protect, getOrder);

OrderRouter.post("/", protect, createOrder);
OrderRouter.put("/:id/status", protect, authorize("admin"), updateOrderStatus);

export default OrderRouter;