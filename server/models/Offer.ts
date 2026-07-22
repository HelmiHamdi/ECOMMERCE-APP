import mongoose, {
  Schema,
  InferSchemaType,
  HydratedDocument,
} from "mongoose";

const offerSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },

   
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => Array.isArray(arr) && arr.length <= 10,
        message: "Une offre ne peut pas contenir plus de 10 images.",
      },
    },

    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false,
      default: null,
    },
    status: {
      type: String,
      enum: ["in_stock", "incoming", "out_of_stock", "on_order_48h"],
      default: "in_stock",
    },
    originalPrice: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, required: true, min: 0, max: 100 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

type OfferFields = InferSchemaType<typeof offerSchema>;

offerSchema.virtual("finalPrice").get(function () {
  const doc = this as unknown as OfferFields;
  const originalPrice = doc.originalPrice ?? 0;
  const discountPercentage = doc.discountPercentage ?? 0;
  const discounted = originalPrice - (originalPrice * discountPercentage) / 100;
  return Math.round(discounted * 100) / 100;
});

offerSchema.pre("validate", function (this: OfferFields) {
  if (this.startDate) {
    const s = new Date(this.startDate);
    s.setHours(0, 0, 0, 0);
    this.startDate = s;
  }
  if (this.endDate) {
    const e = new Date(this.endDate);
    e.setHours(23, 59, 59, 999);
    this.endDate = e;
  }

  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    throw new Error("La date de fin doit être postérieure à la date de début");
  }
});

export type IOffer = HydratedDocument<OfferFields & { finalPrice: number }>;

const Offer = mongoose.model<OfferFields & { finalPrice: number }>(
  "Offer",
  offerSchema
);

export default Offer;