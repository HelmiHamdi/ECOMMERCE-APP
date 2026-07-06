import express from "express";
import { authorize, protect } from "../middleware/auth.js";
import {
  subscribe,
  unsubscribe,
  getAllSubscribers,
} from "../controllers/newsletterController.js";

const NewsletterRouter = express.Router();


NewsletterRouter.post("/subscribe", subscribe);
NewsletterRouter.post("/unsubscribe", unsubscribe);


NewsletterRouter.get("/admin/all", protect, authorize("admin"), getAllSubscribers);

export default NewsletterRouter;