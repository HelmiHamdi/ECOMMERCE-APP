import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { useSocket } from "@/context/SocketContext";
import { useMyMongoUser } from "@/app/hooks/useMyMongoUser";
import { useLanguage } from "@/context/LanguageContext";
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
  const { t } = useLanguage();

  // ✅ NOUVEAU : on récupère aussi le nom/photo Mongo de l'utilisateur connecté
  // pour les transmettre dans "call:invite" (affichés côté destinataire sur
  // l'écran "appel entrant"). Le hook peut ne pas exposer name/image selon ta
  // version -> fallback sur les infos Clerk pour ne jamais planter.
  const myMongo = useMyMongoUser() as any;
  const myName = myMongo?.name || myMongo?.myName || user?.fullName || user?.firstName || t("adminDefaultName");
  const myImage = myMongo?.image || myMongo?.myImage || user?.imageUrl;

  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [status, setStatus] = useState<"calling" | "connected" | "ended">("calling");
  const [durationSec, setDurationSec] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const timerRef = useRef<any>(null);
  // ✅ NOUVEAU : référence vers le son "ça sonne" (ringback), joué UNIQUEMENT
  // côté appelant (mode "outgoing") tant que l'appelé n'a pas décroché.
  const ringbackRef = useRef<Audio.Sound | null>(null);
  // ✅ Verrou pour éviter de lancer/arrêter cleanup() deux fois (double appel
  // possible entre l'événement socket call:end et l'appui manuel sur raccrocher).
  const cleanedUpRef = useRef(false);

  useEffect(() => {
    setupCall();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "connected") {
      stopRingback();
      if (!timerRef.current) {
        timerRef.current = setInterval(() => setDurationSec((s) => s + 1), 1000);
      }
    }
    if (status === "ended" && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [status]);

  // ✅ NOUVEAU : tonalité "ça sonne" jouée côté appelant, en boucle, jusqu'à
  // ce que l'appel soit accepté (status devient "connected") ou raccroché.
  const playRingback = async () => {
    if (mode !== "outgoing") return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/sounds/ringback.mp3"),
        { isLooping: true, shouldPlay: true, volume: 0.8 }
      );
      ringbackRef.current = sound;
    } catch (err) {
      console.error("Erreur lecture tonalité d'appel:", err);
    }
  };

  const stopRingback = async () => {
    if (ringbackRef.current) {
      try {
        await ringbackRef.current.stopAsync();
        await ringbackRef.current.unloadAsync();
      } catch {}
      ringbackRef.current = null;
    }
  };

  const setupCall = async () => {
    try {
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
        // ✅ On transmet notre nom/photo pour l'écran "appel entrant" côté
        // destinataire (voir IncomingCallContext), + on lance la tonalité.
        socket?.emit("call:invite", {
          toUserId,
          callId: conversationId,
          kind,
          fromName: myName,
          fromImage: myImage,
        });
        playRingback();

        const offer = await pc.createOffer({});
        await pc.setLocalDescription(offer);
        socket?.emit("call:offer", { toUserId, callId: conversationId, sdp: offer });
      }

      socket?.on("call:accept", async () => {
        // ✅ L'appelé a décroché : on coupe la tonalité, la connexion WebRTC
        // se finalisera via l'échange offer/answer (status passera à
        // "connected" dès que ontrack se déclenchera).
        stopRingback();
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
    } catch (err) {
      console.error("Erreur configuration de l'appel:", err);
      cleanup();
      router.back();
    }
  };

  const cleanup = () => {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;

    stopRingback();
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
          {status === "calling"
            ? mode === "outgoing"
              ? t("callInProgress")
              : t("callConnecting")
            : t("callConnected")}
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