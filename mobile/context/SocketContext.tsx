import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { io, Socket } from "socket.io-client";
import { useAuth, useUser } from "@clerk/clerk-expo";

const SOCKET_URL = __DEV__
  ? "http://192.168.194.136:3000"
  : "https://ineshop-socket.onrender.com";

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

      console.log("🔌 Connexion socket en cours vers", SOCKET_URL);

      socketInstance = io(SOCKET_URL, {
        path: "/socket.io",
        auth: { token },
        // ✅ FIX : fallback en polling si le websocket pur échoue
        // (réseaux mobiles avec proxy, changement 4G/WiFi, etc.)
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 3000,
        timeout: 10000,
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

  // ✅ FIX PRINCIPAL (messages qui n'arrivent pas) : quand l'app revient au
  // premier plan (l'utilisateur rouvre l'app après l'avoir mise en arrière-plan
  // ou après le sleep de Render), on force une reconnexion si le socket n'est
  // plus connecté. Sans ça, le socket peut rester "mort" en silence et aucun
  // nouveau message n'arrive tant que l'app n'est pas complètement relancée.
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active" && socketRef.current) {
        if (!socketRef.current.connected) {
          console.log("🔄 App au premier plan — reconnexion socket forcée");
          socketRef.current.connect();
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  return (
    <SocketContext.Provider value={{ socket, onlineUserIds, connected }}>
      {children}
    </SocketContext.Provider>
  );
}