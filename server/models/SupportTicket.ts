import mongoose, { Schema } from "mongoose";
import { ISupportTicket } from "../types/index.js";

// -----------------------------------------------------------------------
// IMPORTANT : pensez à mettre à jour l'interface ISupportTicket dans
// ../types/index.ts pour ajouter les nouveaux champs, par ex. :
//
// export interface ISupportTicket extends Document {
//   user: Types.ObjectId;
//   subject: string;
//   message: string;
//   category: "order" | "return" | "defective" | "delivery" | "payment" | "other";
//   orderNumber?: string;
//   priority: "low" | "normal" | "high";
//   status: "open" | "in_progress" | "closed";
//   reply?: string;
//   createdAt: Date;
//   updatedAt: Date;
// }
// -----------------------------------------------------------------------

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },

    // Catégorie de la demande SAV (permet de trier/orienter le traitement)
    category: {
      type: String,
      enum: ["order", "return", "defective", "delivery", "payment", "other"],
      default: "other",
    },

    // Référence de commande liée à la demande (facultatif, saisi par le client)
    orderNumber: { type: String, trim: true },

    // Priorité de traitement — "high" est positionné automatiquement pour
    // les catégories sensibles (produit défectueux / retour) à la création,
    // mais reste modifiable par un admin.
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "closed"],
      default: "open",
    },
    reply: { type: String },
  },
  { timestamps: true }
);

const SupportTicket = mongoose.model<ISupportTicket>(
  "SupportTicket",
  supportTicketSchema
);

export default SupportTicket;