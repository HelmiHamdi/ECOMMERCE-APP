import { Request, Response } from "express";

import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import { getIO, getSocketIdsForUser } from "../sockets/chatSocket.js";

// import { sendPushNotification } from "../services/pushService.js";

// ✅ NOUVEAU : renvoie le profil Mongo de l'admin actuellement connecté.
// Indispensable côté front pour comparer sender._id avec le "vrai" id (et non l'id Clerk).
export const getMe = async (req: Request, res: Response) => {
  try {
    const me = req.user as any;
    if (!me) {
      return res.status(401).json({ success: false, message: "Non authentifié" });
    }
    res.json({
      success: true,
      data: {
        _id: me._id,
        name: me.name,
        email: me.email,
        image: me.image,
        role: me.role,
      },
    });
  } catch (error: any) {
    console.error("GET ME ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyConversations = async (req: Request, res: Response) => {
  try {
    const me = req.user as any;
    if (!me || me.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const conversations = await Conversation.find({ participants: me._id })
      .populate("participants", "name email image role")
      .populate("lastMessageSender", "name image")
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    const formatted = conversations.map((c: any) => ({
      ...c,
      unreadCount: c.unreadCount?.[me._id.toString()] || 0,
    }));

    res.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("GET CONVERSATIONS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ NOUVEAU : détails d'UNE conversation (participants complets).
// Le ChatScreen l'utilise pour afficher fiablement le nom/avatar de l'AUTRE admin,
// au lieu de deviner à partir des messages (ce qui causait le bug d'affichage).
export const getConversationById = async (req: Request, res: Response) => {
  try {
    const me = req.user as any;
    const { id } = req.params;

    const conversation = await Conversation.findById(id)
      .populate("participants", "name email image role")
      .lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation introuvable" });
    }
    const isParticipant = conversation.participants.some(
      (p: any) => p._id.toString() === me._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({ success: true, data: conversation });
  } catch (error: any) {
    console.error("GET CONVERSATION BY ID ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrCreateConversation = async (req: Request, res: Response) => {
  try {
    const me = req.user as any;
    if (!me || me.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { participantId } = req.body as { participantId?: string };
    if (!participantId) {
      return res.status(400).json({ success: false, message: "participantId requis" });
    }
    if (participantId === me._id.toString()) {
      return res.status(400).json({ success: false, message: "Impossible de discuter avec soi-même" });
    }

    const other = await User.findById(participantId);
    if (!other || other.role !== "admin") {
      return res.status(404).json({ success: false, message: "Cet utilisateur n'est pas un administrateur" });
    }

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [me._id, other._id], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [me._id, other._id],
        isGroup: false,
      });
    }

    const populated = await conversation.populate("participants", "name email image role");

    res.json({ success: true, data: populated });
  } catch (error: any) {
    console.error("GET OR CREATE CONVERSATION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const me = req.user as any;
    const { id } = req.params;
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "30", 10);

    const conversation = await Conversation.findById(id).lean();
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation introuvable" });
    }
    if (!conversation.participants.some((p: any) => p.toString() === me._id.toString())) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const messages = await Message.find({
      conversation: id,
      deletedFor: { $ne: me._id },
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("sender", "name image")
      .lean();

    // ✅ On répond direct, sans attendre le "mark as read" -> chargement instantané
    res.json({ success: true, data: messages.reverse(), page });

    // ✅ Mise à jour "lu" en arrière-plan (n'impacte plus le temps de réponse)
    Message.updateMany(
      { conversation: id, sender: { $ne: me._id }, readBy: { $ne: me._id } },
      { $addToSet: { readBy: me._id } }
    ).catch((e) => console.error("MARK READ ERROR:", e));

    Conversation.updateOne(
      { _id: id },
      { $set: { [`unreadCount.${me._id.toString()}`]: 0 } }
    ).catch((e) => console.error("RESET UNREAD ERROR:", e));
  } catch (error: any) {
    console.error("GET MESSAGES ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const me = req.user as any;
    const { id } = req.params;
    const { type = "text", content } = req.body as { type?: string; content?: string };

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation introuvable" });
    }
    if (!conversation.participants.some((p) => p.toString() === me._id.toString())) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const messageData: any = { conversation: id, sender: me._id, type };

    if (type === "text") {
      if (!content?.trim()) {
        return res.status(400).json({ success: false, message: "Message vide" });
      }
      messageData.content = content.trim();
    } else if (["image", "video", "file", "audio"].includes(type)) {
      // ✅ Le vocal utilise exactement ce même chemin (type="audio"), déjà supporté côté backend.
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Fichier requis" });
      }
      const resourceType = type === "image" ? "image" : type === "video" ? "video" : "raw";
      const uploadResult: any = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "shop-mobile/chat", resource_type: resourceType },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(req.file!.buffer);
      });
      messageData.fileUrl = uploadResult.secure_url;
      messageData.fileName = req.file.originalname;
      messageData.fileMimeType = req.file.mimetype;
      messageData.fileSize = req.file.size;
      if (type === "video") messageData.thumbnailUrl = uploadResult.secure_url.replace(/\.\w+$/, ".jpg");
    } else {
      return res.status(400).json({ success: false, message: "Type de message invalide" });
    }

    const message = await Message.create(messageData);
    await message.populate("sender", "name image");

    const preview =
      type === "text" ? content!.trim().slice(0, 120) : `[${type}]`;
    conversation.lastMessage = preview;
    conversation.lastMessageType = type as any;
    conversation.lastMessageAt = new Date();
    conversation.lastMessageSender = me._id;

    const others = conversation.participants.filter(
      (p) => p.toString() !== me._id.toString()
    );
    others.forEach((p) => {
      const key = p.toString();
      conversation.unreadCount.set(key, (conversation.unreadCount.get(key) || 0) + 1);
    });
    await conversation.save();

    const io = getIO();
    conversation.participants.forEach((p) => {
      io.to(`user:${p.toString()}`).emit("message:new", {
        conversationId: id,
        message,
      });
    });

    res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    console.error("SEND MESSAGE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ NOUVEAU : modification d'un message texte (seulement par son auteur).
export const editMessage = async (req: Request, res: Response) => {
  try {
    const me = req.user as any;
    const { messageId } = req.params;
    const { content } = req.body as { content?: string };

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: "Contenu vide" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message introuvable" });
    }
    if (message.sender.toString() !== me._id.toString()) {
      return res.status(403).json({ success: false, message: "Vous ne pouvez modifier que vos propres messages" });
    }
    if (message.type !== "text") {
      return res.status(400).json({ success: false, message: "Seuls les messages texte sont modifiables" });
    }
    if (message.isDeleted) {
      return res.status(400).json({ success: false, message: "Message supprimé" });
    }

    message.content = content.trim();
    message.edited = true;
    message.editedAt = new Date();
    await message.save();
    await message.populate("sender", "name image");

    const conversation = await Conversation.findById(message.conversation).lean();
    if (conversation) {
      const io = getIO();
      conversation.participants.forEach((p: any) => {
        io.to(`user:${p.toString()}`).emit("message:edited", {
          conversationId: message.conversation.toString(),
          message,
        });
      });
    }

    res.json({ success: true, data: message });
  } catch (error: any) {
    console.error("EDIT MESSAGE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ NOUVEAU : suppression d'un message (seulement par son auteur), suppression "douce"
// pour que l'autre admin voie "Message supprimé" en temps réel.
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const me = req.user as any;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message introuvable" });
    }
    if (message.sender.toString() !== me._id.toString()) {
      return res.status(403).json({ success: false, message: "Vous ne pouvez supprimer que vos propres messages" });
    }

    message.isDeleted = true;
    message.content = undefined;
    message.fileUrl = undefined;
    message.fileName = undefined;
    message.thumbnailUrl = undefined;
    await message.save();

    const conversation = await Conversation.findById(message.conversation).lean();
    if (conversation) {
      const io = getIO();
      conversation.participants.forEach((p: any) => {
        io.to(`user:${p.toString()}`).emit("message:deleted", {
          conversationId: message.conversation.toString(),
          messageId: message._id.toString(),
        });
      });
    }

    res.json({ success: true, data: { _id: message._id } });
  } catch (error: any) {
    console.error("DELETE MESSAGE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAvailableAdmins = async (req: Request, res: Response) => {
  try {
    const me = req.user as any;
    const admins = await User.find({ role: "admin", _id: { $ne: me._id } }).select(
      "name email image"
    );
    res.json({ success: true, data: admins });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const purgeConversationsForDemotedUser = async (userId: string) => {
  const conversations = await Conversation.find({ participants: userId });
  if (conversations.length === 0) return;

  const io = getIO();
  const ids = conversations.map((c) => c._id);

  await Message.deleteMany({ conversation: { $in: ids } });
  await Conversation.deleteMany({ _id: { $in: ids } });

  conversations.forEach((c) => {
    c.participants.forEach((p) => {
      io.to(`user:${p.toString()}`).emit("conversation:removed", {
        conversationId: c._id.toString(),
      });
    });
  });
};