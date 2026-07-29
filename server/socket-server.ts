import "dotenv/config";
import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import connectDB from "./config/db.js";
import { initChatSocket } from "./sockets/chatSocket.js";

const app = express();
app.use(cors());
app.use(express.json());


app.get("/", (req: Request, res: Response) => {
    res.send("Socket.IO server is live ✅");
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