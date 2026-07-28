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
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  onlineUserIds: new Set(),
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const socketRef = useRef<Socket | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    const connect = async () => {
      if (!user) return;
      const token = await getToken();
      if (!token || !isMounted) return;

      const socket = io(SOCKET_URL, {
        path: "/socket.io",
        auth: { token },
        transports: ["websocket"],
      });

      socket.on("presence:update", ({ userId, online }) => {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          if (online) next.add(userId);
          else next.delete(userId);
          return next;
        });
      });

      socketRef.current = socket;
    };

    connect();

    return () => {
      isMounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, onlineUserIds }}>
      {children}
    </SocketContext.Provider>
  );
}