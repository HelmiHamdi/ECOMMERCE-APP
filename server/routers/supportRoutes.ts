import express from "express";
import {
  closeTicket,
  createTicket,
  getAllTickets,
  getMyTickets,
  getTicket,
  replyTicket,
  updateTicketPriority,
  updateTicketStatus,
} from "../controllers/supportController.js";
import { authorize, protect } from "../middleware/auth.js";

const SupportRouter = express.Router();


SupportRouter.use(protect);


SupportRouter.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

SupportRouter.post("/", createTicket);
SupportRouter.get("/my", getMyTickets);
SupportRouter.get("/", authorize("admin"), getAllTickets);
SupportRouter.get("/:id", getTicket);
SupportRouter.put("/:id/reply", authorize("admin"), replyTicket);
SupportRouter.put("/:id/close", authorize("admin"), closeTicket);
SupportRouter.put("/:id/status", authorize("admin"), updateTicketStatus);
SupportRouter.put("/:id/priority", authorize("admin"), updateTicketPriority);

export default SupportRouter;