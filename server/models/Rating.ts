import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
    },
    stars: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      default: "",
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Utilisateur peut noter une seule fois
ratingSchema.index({ clerkId: 1 }, { unique: true });

const Rating = mongoose.model("Rating", ratingSchema);
export default Rating;