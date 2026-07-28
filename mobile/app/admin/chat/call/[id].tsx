import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSocket } from "@/context/SocketContext";
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  RTCView,
} from "react-native-webrtc";



const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  // Ajoute ici ton serveur TURN pour la production, ex:
  // { urls: "turn:ton-turn-server:3478", username: "...", credential: "..." },
];

export default function CallScreen() {
  const { id: conversationId, toUserId, kind, mode } = useLocalSearchParams<{
    id: string;
    toUserId: string;
    kind: "audio" | "video";
    mode: "outgoing" | "incoming";
  }>();
  const router = useRouter();
  const { user } = useUser();
  const { socket } = useSocket();
  const insets = useSafeAreaInsets();

  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [status, setStatus] = useState<"calling" | "connected" | "ended">("calling");
  const [durationSec, setDurationSec] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    setupCall();
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (status === "connected" && !timerRef.current) {
      timerRef.current = setInterval(() => setDurationSec((s) => s + 1), 1000);
    }
    if (status === "ended" && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [status]);

  const setupCall = async () => {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: kind === "video" ? { facingMode: "user" } : false,
    });
    setLocalStream(stream);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

    // @ts-ignore - événement ontrack disponible via react-native-webrtc
    pc.ontrack = (event: any) => {
      setRemoteStream(event.streams[0]);
      setStatus("connected");
    };

    // @ts-ignore
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        socket?.emit("call:ice-candidate", {
          toUserId,
          callId: conversationId,
          candidate: event.candidate,
        });
      }
    };

    if (mode === "outgoing") {
      socket?.emit("call:invite", { toUserId, callId: conversationId, kind });
      const offer = await pc.createOffer({});
      await pc.setLocalDescription(offer);
      socket?.emit("call:offer", { toUserId, callId: conversationId, sdp: offer });
    }

    socket?.on("call:accept", async () => {
      // rien à faire ici côté appelant, on attend "call:answer"
    });

    socket?.on("call:answer", async ({ sdp }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket?.on("call:offer", async ({ sdp }) => {
      // cas de l'appelé: reçoit l'offre, répond
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket?.emit("call:answer", { toUserId, callId: conversationId, sdp: answer });
    });

    socket?.on("call:ice-candidate", async ({ candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("Erreur ICE candidate:", err);
      }
    });

    socket?.on("call:decline", () => {
      setStatus("ended");
      cleanup();
      router.back();
    });

    socket?.on("call:end", () => {
      setStatus("ended");
      cleanup();
      router.back();
    });
  };

  const cleanup = () => {
    localStream?.getTracks().forEach((t: any) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    socket?.off("call:accept");
    socket?.off("call:answer");
    socket?.off("call:offer");
    socket?.off("call:ice-candidate");
    socket?.off("call:decline");
    socket?.off("call:end");
  };

  const endCall = () => {
    socket?.emit("call:end", { toUserId, callId: conversationId, durationSec });
    setStatus("ended");
    cleanup();
    router.back();
  };

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach((t: any) => (t.enabled = muted));
    setMuted((m) => !m);
  };

  const formatDuration = (s: number) => {
    const mm = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const isVideo = kind === "video";

  return (
    <View style={styles.root}>
      {isVideo && remoteStream ? (
        <RTCView streamURL={remoteStream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" />
      ) : (
        <View style={styles.audioBackdrop}>
          <View style={styles.avatarRing}>
            <Image
              source={{ uri: "https://placehold.co/160" }}
              style={styles.audioAvatar}
            />
          </View>
        </View>
      )}

      {isVideo && localStream && (
        <View style={[styles.pipWrap, { top: insets.top + 16 }]}>
          <RTCView streamURL={localStream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" />
        </View>
      )}

      {/* Top status */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.statusLabel}>
          {status === "calling" ? "Appel en cours..." : "Connecté"}
        </Text>
        {status === "connected" && (
          <Text style={styles.durationLabel}>{formatDuration(durationSec)}</Text>
        )}
      </View>

      {/* Bottom controls */}
      <View style={[styles.controlsBar, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          onPress={() => setSpeakerOn((s) => !s)}
          style={[styles.controlBtn, speakerOn && styles.controlBtnActive]}
        >
          <Ionicons
            name={speakerOn ? "volume-high" : "volume-mute"}
            size={22}
            color={speakerOn ? "#111" : "#fff"}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={endCall} style={styles.endBtn}>
          <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleMute}
          style={[styles.controlBtn, muted && styles.controlBtnActive]}
        >
          <Ionicons name={muted ? "mic-off" : "mic"} size={22} color={muted ? "#111" : "#fff"} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#111" },
  audioBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17171a",
  },
  avatarRing: {
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  audioAvatar: { width: 152, height: 152, borderRadius: 76, backgroundColor: "#2a2a2e" },
  pipWrap: {
    position: "absolute",
    right: 16,
    width: 104,
    height: 148,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center" },
  statusLabel: { color: "#fff", fontSize: 15, fontWeight: "600" },
  durationLabel: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 },
  controlsBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
  },
  controlBtnActive: { backgroundColor: "#fff" },
  endBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
});