import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useSocket } from "@/context/SocketContext";
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  RTCView,
} from "react-native-webrtc";

// ⚠️ Nécessite react-native-webrtc -> ne fonctionne PAS dans Expo Go.
// Il faut un dev client (npx expo prebuild + eas build --profile development)
// ou "npx expo run:android" / "npx expo run:ios".

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

  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [status, setStatus] = useState<"calling" | "connected" | "ended">("calling");
  const [durationSec, setDurationSec] = useState(0);

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

  return (
    <View style={{ flex: 1, backgroundColor: "#111" }}>
      {kind === "video" && remoteStream && (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={{ flex: 1 }}
          objectFit="cover"
        />
      )}
      {kind === "video" && localStream && (
        <RTCView
          streamURL={localStream.toURL()}
          style={{
            position: "absolute",
            top: 40,
            right: 16,
            width: 100,
            height: 140,
            borderRadius: 12,
          }}
          objectFit="cover"
        />
      )}

      <View
        style={{
          position: "absolute",
          top: 60,
          alignSelf: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16 }}>
          {status === "calling" ? "Appel en cours..." : `Connecté · ${durationSec}s`}
        </Text>
      </View>

      <View
        style={{
          position: "absolute",
          bottom: 60,
          alignSelf: "center",
        }}
      >
        <TouchableOpacity
          onPress={endCall}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "#ef4444",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}