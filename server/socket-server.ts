import "dotenv/config";
import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import connectDB from "./config/db.js";
import { initChatSocket, getIO } from "./sockets/chatSocket.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Socket.IO server is live ✅");
});

// ✅ NOUVEAU : endpoint interne appelé par server.ts (Vercel) pour relayer
// un emit socket.io, puisque Vercel n'a pas socket.io initialisé chez lui.
// Protégé par un secret partagé jamais exposé au client mobile.
app.post("/internal/socket-emit", (req: Request, res: Response) => {
  const secret = req.headers["x-internal-secret"];
  if (secret !== process.env.INTERNAL_SOCKET_SECRET) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { rooms, event, payload } = req.body as {
    rooms: string[];
    event: string;
    payload: any;
  };

  if (!Array.isArray(rooms) || !event) {
    return res.status(400).json({ success: false, message: "rooms[] et event requis" });
  }

  try {
    const io = getIO();
    rooms.forEach((room) => io.to(room).emit(event, payload));
    res.json({ success: true });
  } catch (err: any) {
    console.error("INTERNAL SOCKET EMIT ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

try {
  await connectDB();
  console.log("✅ MongoDB connecté (socket server)");
} catch (err) {
  console.error("❌ Échec connexion DB:", err);
  process.exit(1);
}

const server = http.createServer(app);
initChatSocket(server);

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🔌 Socket.IO server running on port ${port}`);
});