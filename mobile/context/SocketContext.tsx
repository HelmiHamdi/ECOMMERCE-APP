import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth, useUser } from "@clerk/clerk-expo";

const SOCKET_URL = "http://192.168.194.136:3000";

interface SocketContextValue {
  socket: Socket | null;
  onlineUserIds: Set<string>;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  onlineUserIds: new Set(),
  connected: false,
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let isMounted = true;
    let socketInstance: Socket | null = null;

    const connect = async () => {
 
      if (!isLoaded || !isSignedIn || !user) return;
      const token = await getToken();
      if (!token || !isMounted) return;

      console.log("🔌 Connexion socket en cours...");

      socketInstance = io(SOCKET_URL, {
        path: "/socket.io",
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socketInstance.on("connect", () => {
        if (!isMounted) return;
        console.log("✅ Socket connecté :", socketInstance?.id);
        setConnected(true);
      });

      socketInstance.on("disconnect", (reason) => {
        if (!isMounted) return;
        console.log("❌ Socket déconnecté :", reason);
        setConnected(false);
      });

      socketInstance.on("connect_error", (err) => {
        console.error("⚠️ Erreur connexion socket:", err.message);
      });

      socketInstance.on("presence:update", ({ userId, online }) => {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          if (online) next.add(userId);
          else next.delete(userId);
          return next;
        });
      });

      socketRef.current = socketInstance;
      if (isMounted) setSocket(socketInstance);
    };

    connect();

    return () => {
      isMounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, [isLoaded, isSignedIn, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, onlineUserIds, connected }}>
      {children}
    </SocketContext.Provider>
  );
}