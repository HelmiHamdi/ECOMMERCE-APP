import { Request, Response } from "express";
import SupportTicket from "../models/SupportTicket.js";
import {
  sendAdminNotification,
  sendUserNotification,
} from "../utils/sendNotification.js";

const STATUS_LABELS: Record<string, string> = {
  open: "en attente",
  in_progress: "en cours de traitement",
  closed: "résolue",
};

const CATEGORY_LABELS: Record<string, string> = {
  order: "Commande",
  return: "Retour / Remboursement",
  defective: "Produit défectueux",
  delivery: "Livraison",
  payment: "Paiement",
  other: "Autre",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "faible",
  normal: "normale",
  high: "urgente",
};

const ALLOWED_CATEGORIES = [
  "order",
  "return",
  "defective",
  "delivery",
  "payment",
  "other",
];

const ALLOWED_PRIORITIES = ["low", "normal", "high"];

// Catégories SAV pour lesquelles on positionne automatiquement une
// priorité "urgente" à la création du ticket (impact client fort).
const AUTO_HIGH_PRIORITY_CATEGORIES = ["defective", "return"];

// POST /api/support (user connecté)
export const createTicket = async (req: Request, res: Response) => {
  try {
    const { subject, message, category, orderNumber } = req.body;

    if (!subject || !message) {
      return res
        .status(400)
        .json({ success: false, message: "Subject and message are required" });
    }

    const resolvedCategory = ALLOWED_CATEGORIES.includes(category)
      ? category
      : "other";

    const priority = AUTO_HIGH_PRIORITY_CATEGORIES.includes(resolvedCategory)
      ? "high"
      : "normal";

    const currentUser = (req as any).user;

    const ticket = await SupportTicket.create({
      user: currentUser._id,
      subject,
      message,
      category: resolvedCategory,
      orderNumber: orderNumber?.trim() || undefined,
      priority,
    });

    // Notifie tous les admins qu'un nouveau ticket SAV vient d'arriver,
    // avec la catégorie et, si présente, la référence de commande, pour
    // que l'équipe support priorise correctement.
    const categoryLabel = CATEGORY_LABELS[resolvedCategory];
    const orderInfo = ticket.orderNumber ? ` (Commande #${ticket.orderNumber})` : "";
    const urgentTag = priority === "high" ? "🔴 URGENT — " : "";

    await sendAdminNotification(
      "Nouvelle demande SAV 🎫",
      `${urgentTag}${currentUser.name ?? "Un client"} : "${subject}" — ${categoryLabel}${orderInfo}`,
      "support",
      { ticketId: ticket._id }
    );

    res.status(201).json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/support/my (user connecté) -> ses propres tickets
export const getMyTickets = async (req: Request, res: Response) => {
  try {
    const tickets = await SupportTicket.find({
      user: (req as any).user._id,
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: tickets });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/support (admin) -> tous les tickets, filtrables par statut et/ou catégorie
export const getAllTickets = async (req: Request, res: Response) => {
  try {
    const { status, category } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const tickets = await SupportTicket.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: tickets });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/support/:id (owner ou admin)
export const getTicket = async (req: Request, res: Response) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate(
      "user",
      "name email"
    );
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    const currentUser = (req as any).user;
    const isOwner = ticket.user._id.toString() === currentUser._id.toString();
    if (!isOwner && currentUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/support/:id/reply (admin) -> répondre + passer en in_progress
export const replyTicket = async (req: Request, res: Response) => {
  try {
    const { reply } = req.body;
    if (!reply) {
      return res
        .status(400)
        .json({ success: false, message: "Reply message is required" });
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { reply, status: "in_progress" },
      { new: true, runValidators: true }
    );

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    // Notifie l'utilisateur qu'il a reçu une réponse
    await sendUserNotification(
      ticket.user.toString(),
      "Réponse à votre demande 💬",
      `Le support a répondu à "${ticket.subject}"`,
      "support",
      { ticketId: ticket._id, status: ticket.status }
    );

    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/support/:id/close (admin)
export const closeTicket = async (req: Request, res: Response) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status: "closed" },
      { new: true }
    );

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    await sendUserNotification(
      ticket.user.toString(),
      "Demande résolue ✅",
      `Votre demande "${ticket.subject}" a été marquée comme résolue.`,
      "support",
      { ticketId: ticket._id, status: ticket.status }
    );

    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/support/:id/status (admin) -> changer librement le statut
// (en attente / en cours / résolu), ex: pour rouvrir un ticket clôturé
export const updateTicketStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["open", "in_progress", "closed"];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Statut invalide. Valeurs autorisées : open, in_progress, closed",
      });
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    await sendUserNotification(
      ticket.user.toString(),
      "Mise à jour de votre demande",
      `Votre demande "${ticket.subject}" est maintenant ${STATUS_LABELS[status]}.`,
      "support",
      { ticketId: ticket._id, status: ticket.status }
    );

    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/support/:id/priority (admin) -> ajuster manuellement la
// priorité de traitement d'une demande SAV (ex: repasser un ticket en
// urgent suite à un appel client, ou le redescendre en normal).
export const updateTicketPriority = async (req: Request, res: Response) => {
  try {
    const { priority } = req.body;

    if (!priority || !ALLOWED_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Priorité invalide. Valeurs autorisées : low, normal, high",
      });
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { priority },
      { new: true }
    );

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    // On informe le client uniquement si sa demande passe en urgent,
    // pour éviter de le notifier sur un simple ajustement interne mineur.
    if (priority === "high") {
      await sendUserNotification(
        ticket.user.toString(),
        "Votre demande est en cours de priorisation",
        `Votre demande "${ticket.subject}" a été marquée comme prioritaire (${PRIORITY_LABELS[priority]}).`,
        "support",
        { ticketId: ticket._id, priority: ticket.priority }
      );
    }

    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};