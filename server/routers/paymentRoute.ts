// routes/paymentRoutes.ts
import express from "express";
import { createPaymentIntent, stripeWebhook } from "../controllers/paymentController.js";
import { protect } from "../middleware/auth.js";

const PaymentRouter = express.Router();

// ⚠️ webhook AVANT express.json() — raw body requis
PaymentRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

PaymentRouter.post("/create-payment-intent", protect, createPaymentIntent);

export default PaymentRouter;