import express from "express";
import {
  submitRating,
  getMyRating,
  deleteMyRating,
  getAllRatings,
} from "../controllers/ratingController.js";
import { protect, authorize } from "../middleware/auth.js";

const RatingRouter = express.Router();

// User routes
RatingRouter.post("/", protect, submitRating);
RatingRouter.get("/me", protect, getMyRating);
RatingRouter.delete("/me", protect, deleteMyRating);

// Admin route
RatingRouter.get("/", protect, authorize("admin"), getAllRatings);

export default RatingRouter;