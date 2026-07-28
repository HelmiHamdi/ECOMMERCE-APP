import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Modal, View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { useSocket } from "@/context/SocketContext";
import { COLORS } from "@/constants";

interface IncomingCall {
  fromUserId: string;
  callId: string; // = conversationId
  kind: "audio" | "video";
  fromName?: string;
  fromImage?: string;
}

const IncomingCallCtx = createContext<{ activeCallId: string | null }>({ activeCallId: null });
export const useIncomingCall = () => useContext(IncomingCallCtx);

export function IncomingCallProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const router = useRouter();
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const stopRingtone = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  };

  const playRingtone = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/sounds/ringtone.mp3"),
        { isLooping: true, shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;
    } catch (err) {
      console.error("Erreur lecture sonnerie:", err);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const onInvite = (data: IncomingCall) => {
      // ✅ Si un appel est déjà en cours/affiché, on ignore les nouveaux
      if (incoming) return;
      setIncoming(data);
      playRingtone();
    };

    const onCancelOrEnd = ({ callId }: { callId: string }) => {
      setIncoming((current) => {
        if (current && current.callId === callId) {
          stopRingtone();
          return null;
        }
        return current;
      });
    };

    socket.on("call:invite", onInvite);
    socket.on("call:end", onCancelOrEnd);
    socket.on("call:decline", onCancelOrEnd);

    return () => {
      socket.off("call:invite", onInvite);
      socket.off("call:end", onCancelOrEnd);
      socket.off("call:decline", onCancelOrEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, incoming]);

  const accept = async () => {
    if (!incoming || !socket) return;
    const call = incoming;
    await stopRingtone();
    setIncoming(null);
    socket.emit("call:accept", { toUserId: call.fromUserId, callId: call.callId });
    router.push({
      pathname: `/admin/chat/call/${call.callId}` as any,
      params: {
        toUserId: call.fromUserId,
        kind: call.kind,
        mode: "incoming",
      },
    });
  };

  const decline = async () => {
    if (!incoming || !socket) return;
    const call = incoming;
    await stopRingtone();
    setIncoming(null);
    socket.emit("call:decline", { toUserId: call.fromUserId, callId: call.callId });
  };

  return (
    <IncomingCallCtx.Provider value={{ activeCallId: incoming?.callId || null }}>
      {children}

      <Modal visible={!!incoming} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: incoming?.fromImage || "https://placehold.co/140" }}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.name}>{incoming?.fromName || "Administrateur"}</Text>
          <Text style={styles.subtitle}>
            {incoming?.kind === "video" ? "Appel vidéo entrant..." : "Appel entrant..."}
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={decline} style={[styles.actionBtn, styles.declineBtn]}>
              <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={accept} style={[styles.actionBtn, styles.acceptBtn]}>
              <Ionicons
                name={incoming?.kind === "video" ? "videocam" : "call"}
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </IncomingCallCtx.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10,10,12,0.96)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    marginBottom: 20,
  },
  avatar: { width: "100%", height: "100%" },
  name: { color: "#fff", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 6 },
  actionsRow: {
    flexDirection: "row",
    marginTop: 60,
    gap: 60,
  },
  actionBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtn: { backgroundColor: "#ef4444" },
  acceptBtn: { backgroundColor: "#22c55e" },
});