import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyToken } from "@clerk/express";
import User from "../models/User.js";

let io: Server;

const onlineAdmins = new Map<string, Set<string>>();

export const getIO = () => {
  if (!io) throw new Error("Socket.io n'est pas encore initialisé");
  return io;
};

export const getSocketIdsForUser = (userId: string) =>
  Array.from(onlineAdmins.get(userId) || []);

export const isUserOnline = (userId: string) =>
  (onlineAdmins.get(userId)?.size || 0) > 0;

export const initChatSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/socket.io",
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string;
      if (!token) return next(new Error("Token manquant"));

      const verified = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      const clerkId = verified.sub;

      const user = await User.findOne({ clerkId });
      if (!user || user.role !== "admin") {
        return next(new Error("Accès réservé aux administrateurs"));
      }

      (socket as any).userId = user._id.toString();
      (socket as any).userName = user.name;
      (socket as any).userImage = user.image;
      next();
    } catch (err) {
      next(new Error("Authentification invalide"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId as string;
    const userName = (socket as any).userName as string | undefined;
    const userImage = (socket as any).userImage as string | undefined;

    socket.join(`user:${userId}`);
    if (!onlineAdmins.has(userId)) onlineAdmins.set(userId, new Set());
    onlineAdmins.get(userId)!.add(socket.id);

    io.emit("presence:update", { userId, online: true });

    socket.on("typing:start", ({ conversationId, toUserId }) => {
      io.to(`user:${toUserId}`).emit("typing:start", { conversationId, userId });
    });
    socket.on("typing:stop", ({ conversationId, toUserId }) => {
      io.to(`user:${toUserId}`).emit("typing:stop", { conversationId, userId });
    });

    socket.on("message:read", ({ conversationId, toUserId }) => {
      io.to(`user:${toUserId}`).emit("message:read", { conversationId, byUserId: userId });
    });

    // ✅ FIX : on relaie maintenant le nom/photo de l'appelant pour que
    // l'écran "appel entrant" côté destinataire affiche qui appelle
    // (au lieu de juste un id), indispensable pour l'UX type Messenger.
    socket.on("call:invite", ({ toUserId, callId, kind }) => {
      io.to(`user:${toUserId}`).emit("call:invite", {
        fromUserId: userId,
        fromName: userName,
        fromImage: userImage,
        callId,
        kind,
      });
    });

    socket.on("call:accept", ({ toUserId, callId }) => {
      io.to(`user:${toUserId}`).emit("call:accept", { fromUserId: userId, callId });
    });

    socket.on("call:decline", ({ toUserId, callId }) => {
      io.to(`user:${toUserId}`).emit("call:decline", { fromUserId: userId, callId });
    });

    socket.on("call:offer", ({ toUserId, callId, sdp }) => {
      io.to(`user:${toUserId}`).emit("call:offer", { fromUserId: userId, callId, sdp });
    });

    socket.on("call:answer", ({ toUserId, callId, sdp }) => {
      io.to(`user:${toUserId}`).emit("call:answer", { fromUserId: userId, callId, sdp });
    });

    socket.on("call:ice-candidate", ({ toUserId, callId, candidate }) => {
      io.to(`user:${toUserId}`).emit("call:ice-candidate", {
        fromUserId: userId,
        callId,
        candidate,
      });
    });

    socket.on("call:end", ({ toUserId, callId, durationSec }) => {
      io.to(`user:${toUserId}`).emit("call:end", { fromUserId: userId, callId, durationSec });
    });

    socket.on("disconnect", () => {
      onlineAdmins.get(userId)?.delete(socket.id);
      if ((onlineAdmins.get(userId)?.size || 0) === 0) {
        onlineAdmins.delete(userId);
        io.emit("presence:update", { userId, online: false });
      }
    });
  });

  return io;
};