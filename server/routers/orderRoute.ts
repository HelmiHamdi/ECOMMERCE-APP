import express from "express"
import { authorize, protect } from "../middleware/auth.js";
import { createOrder, getAllOrders, getOrder, getOrderInvoice, getOrders, updateOrderStatus } from "../controllers/orderController.js";

const OrderRouter = express.Router();

OrderRouter.get('/:id/invoice',protect,getOrderInvoice);
OrderRouter.get('/',protect,getOrders);
OrderRouter.get('/:id',protect,getOrder);
OrderRouter.post('/',protect, createOrder);
OrderRouter.put('/:id/status',protect,authorize('admin'),updateOrderStatus)
OrderRouter.get('/admin/all',protect,authorize('admin'),getAllOrders)


export default OrderRouter;