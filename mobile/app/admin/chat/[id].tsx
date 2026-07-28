import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import EmojiPicker from "rn-emoji-keyboard"; // ✅ NOUVEAU : clavier emoji complet (npx expo install rn-emoji-keyboard)
import api from "@/constants/api";
import { useSocket } from "@/context/SocketContext";

import { COLORS } from "@/constants";
import { useMyMongoUser } from "@/app/hooks/useMyMongoUser";
import { useLanguage } from "@/context/LanguageContext";

const genTempId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Petit lecteur audio réutilisable pour les messages vocaux
function AudioBubble({ uri, mine }: { uri: string; mine: boolean }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  const togglePlay = async () => {
    try {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await sound.pauseAsync();
          setPlaying(false);
        } else {
          await sound.playAsync();
          setPlaying(true);
        }
        return;
      }
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status: any) => {
          if (status.didJustFinish) setPlaying(false);
        }
      );
      setSound(newSound);
      setPlaying(true);
    } catch (err) {
      console.error("Erreur lecture audio:", err);
    }
  };

  return (
    <TouchableOpacity onPress={togglePlay} style={styles.audioRow}>
      <Ionicons
        name={playing ? "pause-circle" : "play-circle"}
        size={30}
        color={mine ? "#fff" : COLORS.primary}
      />
      <Text style={[mine ? styles.bubbleTextMine : styles.bubbleTextTheirs, { marginLeft: 8 }]}>
        {t("voiceMessage")}
      </Text>
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const { id: conversationId, otherId } = useLocalSearchParams<{
    id: string;
    otherId?: string;
  }>();
  const { getToken } = useAuth();
  const { myId } = useMyMongoUser(); // ✅ le VRAI id Mongo de l'admin connecté
  const router = useRouter();
  const { socket, onlineUserIds } = useSocket();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherInfo, setOtherInfo] = useState<{ name?: string; image?: string } | null>(null);
  const [otherParticipantId, setOtherParticipantId] = useState<string | undefined>(otherId);
  const [showEmoji, setShowEmoji] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [actionMsg, setActionMsg] = useState<any>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordTimerRef = useRef<any>(null);
  // ✅ FIX ("Only one Recording object..."): verrou synchrone qui empêche un
  // second appel à startRecording() de partir avant que le state isRecording
  // ait fini de se mettre à jour (React state n'est pas synchrone), ce qui
  // pouvait déclencher deux préparations d'enregistrement en parallèle.
  const recordingLockRef = useRef(false);

  const listRef = useRef<FlatList>(null);
  const typingTimeout = useRef<any>(null);

  const isOtherOnline = otherParticipantId ? onlineUserIds?.has(otherParticipantId) : false;

  // ✅ Récupère la conversation avec ses participants Mongo réels (fiable, indépendant des messages)
  const loadConversationInfo = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token || !conversationId || !myId) return;
      const res = await api.get(`/chatAdmin/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const conv = res.data?.data;
      const other = conv?.participants?.find((p: any) => p._id !== myId);
      if (other) {
        setOtherInfo({ name: other.name, image: other.image });
        setOtherParticipantId(other._id);
      }
    } catch (err) {
      console.error("Erreur chargement conversation:", err);
    }
  }, [getToken, conversationId, myId]);

  useEffect(() => {
    if (myId) loadConversationInfo();
  }, [myId, loadConversationInfo]);

  const loadMessages = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token || !conversationId) return;
      const res = await api.get(`/chatAdmin/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.data || [];
      setMessages(data);
    } catch (err) {
      console.error("Erreur chargement messages:", err);
      Toast.show({ type: "error", text1: t("failedToLoadMessages") });
    }
  }, [getToken, conversationId, t]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // ✅ FIX (message "parfois ne s'affiche pas" / doublons) : on réconcilie
  // maintenant aussi via clientTempId, renvoyé par le serveur dans l'event
  // socket. Si un message optimiste (tempId) correspondant existe déjà, on le
  // remplace au lieu d'ajouter une deuxième entrée — peu importe que ce soit
  // la réponse HTTP ou l'événement socket qui arrive en premier.
  const addMessageIfNew = useCallback((message: any) => {
    setMessages((prev) => {
      if (prev.some((m) => m._id === message._id)) return prev;
      if (message.clientTempId) {
        const optimisticIndex = prev.findIndex((m) => m.tempId === message.clientTempId);
        if (optimisticIndex !== -1) {
          const next = [...prev];
          next[optimisticIndex] = message;
          return next;
        }
      }
      return [...prev, message];
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = ({ conversationId: cid, message }: any) => {
      if (cid !== conversationId) return;
      addMessageIfNew(message);
    };
    const onTypingStart = ({ conversationId: cid }: any) => {
      if (cid === conversationId) setOtherTyping(true);
    };
    const onTypingStop = ({ conversationId: cid }: any) => {
      if (cid === conversationId) setOtherTyping(false);
    };
    const onConversationRemoved = ({ conversationId: cid }: any) => {
      if (cid === conversationId) router.back();
    };
    const onMessageEdited = ({ conversationId: cid, message }: any) => {
      if (cid !== conversationId) return;
      setMessages((prev) => prev.map((m) => (m._id === message._id ? message : m)));
    };
    const onMessageDeleted = ({ conversationId: cid, messageId }: any) => {
      if (cid !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, isDeleted: true, content: undefined, fileUrl: undefined } : m
        )
      );
    };

    socket.on("message:new", onNewMessage);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("conversation:removed", onConversationRemoved);
    socket.on("message:edited", onMessageEdited);
    socket.on("message:deleted", onMessageDeleted);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("conversation:removed", onConversationRemoved);
      socket.off("message:edited", onMessageEdited);
      socket.off("message:deleted", onMessageDeleted);
    };
  }, [socket, conversationId, router, addMessageIfNew]);

  const handleTyping = (val: string) => {
    setText(val);
    if (!socket || !otherParticipantId) return;
    socket.emit("typing:start", { conversationId, toUserId: otherParticipantId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing:stop", { conversationId, toUserId: otherParticipantId });
    }, 1500);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setText("");
  };

  const submitEdit = async () => {
    if (!editingMessage || !text.trim() || sending) return;
    const content = text.trim();
    const msgId = editingMessage._id;
    setSending(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("no token");
      const res = await api.patch(
        `/chatAdmin/messages/${msgId}`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = res.data?.data;
      setMessages((prev) => prev.map((m) => (m._id === msgId ? updated : m)));
      setEditingMessage(null);
      setText("");
    } catch (err) {
      console.error("Erreur modification message:", err);
      Toast.show({ type: "error", text1: t("failedToEditMessage") });
    } finally {
      setSending(false);
    }
  };

  const sendText = async () => {
    if (editingMessage) {
      await submitEdit();
      return;
    }
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText("");

    const tempId = genTempId();
    const optimisticMsg = {
      _id: tempId,
      tempId,
      type: "text",
      content,
      sender: { _id: myId },
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setSending(true);

    try {
      const token = await getToken();
      if (!token || !conversationId) throw new Error("no token");
      // ✅ clientTempId envoyé au serveur pour réconciliation fiable (voir addMessageIfNew)
      const res = await api.post(
        `/chatAdmin/conversations/${conversationId}/messages`,
        { type: "text", content, clientTempId: tempId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newMessage = res.data?.data;
      // Le socket a peut-être déjà remplacé ce tempId (voir addMessageIfNew) ;
      // dans ce cas on ne fait rien pour éviter de recréer une entrée.
      setMessages((prev) => {
        const stillPending = prev.some((m) => m.tempId === tempId);
        if (!stillPending) return prev;
        return prev.map((m) => (m.tempId === tempId ? newMessage : m));
      });
    } catch (err) {
      console.error("Erreur envoi message:", err);
      setMessages((prev) =>
        prev.map((m) => (m.tempId === tempId ? { ...m, pending: false, failed: true } : m))
      );
      Toast.show({
        type: "error",
        text1: t("failedToSendMessage"),
        text2: t("tapMessageToRetry"),
      });
    } finally {
      setSending(false);
    }
  };

  // ✅ FIX PRINCIPAL (retard perçu) : envoi générique avec aperçu optimiste immédiat
  // pour image / fichier / audio, au lieu d'attendre la fin de l'upload Cloudinary
  // avant d'afficher quoi que ce soit. On garde localUri/fileName/mimeType sur le
  // message optimiste pour pouvoir relancer l'upload en cas d'échec (retrySend).
  const sendMediaMessage = async ({
    type,
    uri,
    name,
    mimeType,
  }: {
    type: "image" | "file" | "audio";
    uri: string;
    name: string;
    mimeType: string;
  }) => {
    const tempId = genTempId();
    const optimisticMsg = {
      _id: tempId,
      tempId,
      type,
      // Pour l'aperçu immédiat, on utilise l'URI locale (le composant AudioBubble
      // et l'Image acceptent aussi bien une URI locale qu'une URL distante).
      fileUrl: uri,
      fileName: name,
      localUri: uri,
      mimeType,
      sender: { _id: myId },
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const token = await getToken();
      if (!token || !conversationId) throw new Error("no token");

      const formData = new FormData();
      formData.append("type", type);
      formData.append("clientTempId", tempId); // ✅ pour réconciliation fiable
      formData.append("file", { uri, name, type: mimeType } as any);

      const res = await api.post(
        `/chatAdmin/conversations/${conversationId}/messages`,
        formData,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
      );
      const newMessage = res.data?.data;
      setMessages((prev) => {
        const stillPending = prev.some((m) => m.tempId === tempId);
        if (!stillPending) return prev;
        return prev.map((m) => (m.tempId === tempId ? newMessage : m));
      });
    } catch (err) {
      console.error(`Erreur envoi ${type}:`, err);
      setMessages((prev) =>
        prev.map((m) => (m.tempId === tempId ? { ...m, pending: false, failed: true } : m))
      );
      Toast.show({
        type: "error",
        text1: t("failedToSendMessage"),
        text2: t("tapMessageToRetry"),
      });
    }
  };

  const retrySend = async (msg: any) => {
    if (!msg.tempId) return;

    // Texte : comportement inchangé
    if (msg.type === "text") {
      setMessages((prev) =>
        prev.map((m) => (m.tempId === msg.tempId ? { ...m, pending: true, failed: false } : m))
      );
      try {
        const token = await getToken();
        if (!token || !conversationId) throw new Error("no token");
        const res = await api.post(
          `/chatAdmin/conversations/${conversationId}/messages`,
          { type: msg.type, content: msg.content },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const newMessage = res.data?.data;
        setMessages((prev) => prev.map((m) => (m.tempId === msg.tempId ? newMessage : m)));
      } catch (err) {
        console.error("Erreur retry:", err);
        setMessages((prev) =>
          prev.map((m) => (m.tempId === msg.tempId ? { ...m, pending: false, failed: true } : m))
        );
        Toast.show({ type: "error", text1: t("failedToSendMessage") });
      }
      return;
    }

    // ✅ NOUVEAU : retry pour image / fichier / audio, en réutilisant l'URI locale
    // conservée sur le message optimiste au moment du premier envoi.
    if (!msg.localUri) return;
    setMessages((prev) =>
      prev.map((m) => (m.tempId === msg.tempId ? { ...m, pending: true, failed: false } : m))
    );
    try {
      const token = await getToken();
      if (!token || !conversationId) throw new Error("no token");
      const formData = new FormData();
      formData.append("type", msg.type);
      formData.append("file", {
        uri: msg.localUri,
        name: msg.fileName,
        type: msg.mimeType || "application/octet-stream",
      } as any);
      const res = await api.post(
        `/chatAdmin/conversations/${conversationId}/messages`,
        formData,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
      );
      const newMessage = res.data?.data;
      setMessages((prev) => prev.map((m) => (m.tempId === msg.tempId ? newMessage : m)));
    } catch (err) {
      console.error("Erreur retry média:", err);
      setMessages((prev) =>
        prev.map((m) => (m.tempId === msg.tempId ? { ...m, pending: false, failed: true } : m))
      );
      Toast.show({ type: "error", text1: t("failedToSendMessage") });
    }
  };

  const insertEmoji = (emoji: string) => {
    setText((t) => t + emoji);
  };

  const confirmDelete = (msg: any) => {
    setActionMsg(null);
    Alert.alert(t("deleteMessageTitle"), t("deleteMessageConfirmText"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => deleteMessageRemote(msg) },
    ]);
  };

  const deleteMessageRemote = async (msg: any) => {
    try {
      const token = await getToken();
      if (!token) return;
      await api.delete(`/chatAdmin/messages/${msg._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((prev) =>
        prev.map((m) =>
          m._id === msg._id ? { ...m, isDeleted: true, content: undefined, fileUrl: undefined } : m
        )
      );
    } catch (err) {
      console.error("Erreur suppression message:", err);
      Toast.show({ type: "error", text1: t("failedToDeleteMessage") });
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];

    // ✅ FIX : on affiche l'image immédiatement (optimiste) au lieu d'attendre
    // la fin de l'upload Cloudinary.
    await sendMediaMessage({
      type: "image",
      uri: asset.uri,
      name: asset.fileName || `image_${Date.now()}.jpg`,
      mimeType: asset.mimeType || "image/jpeg",
    });
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (result.canceled) return;
    const asset = result.assets[0];

    // ✅ FIX : idem, aperçu optimiste immédiat pour les fichiers.
    await sendMediaMessage({
      type: "file",
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType || "application/octet-stream",
    });
  };

  // ✅ Messages vocaux
  const startRecording = async () => {
    // ✅ FIX ("Only one Recording object can be prepared at a given time"):
    // verrou synchrone en plus du state isRecording (qui, lui, ne se met à
    // jour qu'au prochain render). Un double-tap rapide sur le bouton micro
    // pouvait déclencher deux createAsync() en parallèle sans ce verrou.
    if (recordingLockRef.current || recordingRef.current) return;
    recordingLockRef.current = true;
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Toast.show({ type: "error", text1: t("microphoneNotAuthorized") });
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error("Erreur démarrage enregistrement:", err);
      Toast.show({ type: "error", text1: t("failedToStartRecording") });
      // ✅ On s'assure qu'aucune référence orpheline ne reste, sinon le
      // prochain essai échoue aussi avec "Only one Recording...".
      recordingRef.current = null;
    } finally {
      recordingLockRef.current = false;
    }
  };

  const cancelRecording = async () => {
    try {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      setIsRecording(false);
      setRecordSeconds(0);
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
      }
    } catch (err) {
      console.error("Erreur annulation enregistrement:", err);
    } finally {
      // ✅ Toujours nettoyé, même si stopAndUnloadAsync a levé une erreur.
      recordingRef.current = null;
    }
  };

  const stopRecordingAndSend = async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    // ✅ On libère la référence immédiatement (avant l'upload) pour que le
    // bouton micro redevienne utilisable tout de suite, même pendant l'envoi.
    recordingRef.current = null;
    try {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      setIsRecording(false);
      setRecordSeconds(0);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) return;

      // ✅ Aperçu optimiste immédiat pour le vocal aussi (bulle "en cours
      // d'envoi" au lieu de rien pendant l'upload).
      await sendMediaMessage({
        type: "audio",
        uri,
        name: `voice_${Date.now()}.m4a`,
        mimeType: "audio/m4a",
      });
    } catch (err) {
      console.error("Erreur envoi message vocal:", err);
      Toast.show({ type: "error", text1: t("failedToSendVoiceMessage") });
    }
  };

  const startCall = (kind: "audio" | "video") => {
    if (!otherParticipantId) return;
    router.push({
      pathname: `/admin/chat/call/${conversationId}` as any,
      params: { toUserId: otherParticipantId, kind, mode: "outgoing" },
    });
  };

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatRecordDuration = (s: number) => {
    const mm = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 10}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
            <Ionicons name="arrow-back" size={22} color="#111" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View>
              <Image
                source={{ uri: otherInfo?.image || "https://placehold.co/40" }}
                style={styles.headerAvatar}
              />
              {isOtherOnline && <View style={styles.onlineDot} />}
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.headerName} numberOfLines={1}>
                {otherInfo?.name || t("conversationDefaultName")}
              </Text>
              <Text style={styles.headerStatus}>
                {otherTyping ? t("typingIndicator") : isOtherOnline ? t("online") : " "}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => startCall("audio")} style={styles.headerIconBtn}>
              <Ionicons name="call-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => startCall("video")} style={styles.headerIconBtn}>
              <Ionicons name="videocam-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m._id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={44} color="#d8d8dc" />
              <Text style={styles.emptyStateText}>{t("noMessagesYet")}</Text>
              <Text style={styles.emptyStateSubtext}>{t("sendFirstMessage")}</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const mine = !!myId && item.sender?._id === myId;
            const prev = messages[index - 1];
            const showAvatar =
              !mine && (!prev || prev.sender?._id !== item.sender?._id);
            return (
              <View
                style={[
                  styles.messageRow,
                  { justifyContent: mine ? "flex-end" : "flex-start" },
                ]}
              >
                {!mine && (
                  <View style={styles.messageAvatarSlot}>
                    {showAvatar && (
                      <Image
                        source={{ uri: item.sender?.image || otherInfo?.image || "https://placehold.co/28" }}
                        style={styles.messageAvatar}
                      />
                    )}
                  </View>
                )}
                <TouchableOpacity
                  activeOpacity={item.failed || mine ? 0.6 : 1}
                  onPress={() => item.failed && retrySend(item)}
                  onLongPress={() => {
                    if (mine && !item.pending && !item.failed && !item.isDeleted && item.type !== "call") {
                      setActionMsg(item);
                    }
                  }}
                  style={[
                    styles.bubble,
                    mine ? styles.bubbleMine : styles.bubbleTheirs,
                    item.pending && { opacity: 0.6 },
                  ]}
                >
                  {item.isDeleted ? (
                    <Text
                      style={[
                        mine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
                        { fontStyle: "italic", opacity: 0.7 },
                      ]}
                    >
                      {t("messageDeleted")}
                    </Text>
                  ) : (
                    <>
                      {item.type === "text" && (
                        <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
                          {item.content}
                        </Text>
                      )}
                      {item.type === "image" && (
                        <Image
                          source={{ uri: item.fileUrl }}
                          style={styles.bubbleImage}
                          resizeMode="cover"
                        />
                      )}
                      {item.type === "audio" && (
                        <AudioBubble uri={item.fileUrl} mine={mine} />
                      )}
                      {item.type === "file" && (
                        <View style={styles.fileRow}>
                          <View
                            style={[
                              styles.fileIconWrap,
                              { backgroundColor: mine ? "rgba(255,255,255,0.2)" : "#fff" },
                            ]}
                          >
                            <Ionicons
                              name="document-text-outline"
                              size={18}
                              color={mine ? "#fff" : COLORS.primary}
                            />
                          </View>
                          <Text
                            style={[
                              mine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
                              { marginLeft: 8, flexShrink: 1 },
                            ]}
                            numberOfLines={1}
                          >
                            {item.fileName}
                          </Text>
                        </View>
                      )}
                      {item.type === "call" && (
                        <View style={styles.fileRow}>
                          <Ionicons
                            name={item.callKind === "video" ? "videocam-outline" : "call-outline"}
                            size={16}
                            color={mine ? "#fff" : "#444"}
                          />
                          <Text
                            style={[
                              mine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
                              { marginLeft: 6 },
                            ]}
                          >
                            {t("call")} {item.callStatus} ({item.callDurationSec || 0}s)
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                  <View style={styles.statusRow}>
                    {item.failed && (
                      <Ionicons name="alert-circle" size={12} color="#ef4444" style={{ marginRight: 4 }} />
                    )}
                    {item.pending && (
                      <Ionicons
                        name="time-outline"
                        size={11}
                        color={mine ? "rgba(255,255,255,0.7)" : "#999"}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    {item.edited && !item.isDeleted && (
                      <Text
                        style={[styles.timestamp, { color: mine ? "rgba(255,255,255,0.7)" : "#999", marginRight: 4 }]}
                      >
                        {t("editingMessageBanner")} ·
                      </Text>
                    )}
                    <Text style={[styles.timestamp, { color: mine ? "rgba(255,255,255,0.7)" : "#999" }]}>
                      {item.failed ? `${t("failedToSendMessage")} — ${t("tapMessageToRetry")}` : formatTime(item.createdAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
        />

        {otherTyping && (
          <View style={styles.typingBar}>
            <View style={styles.typingDot} />
            <View style={[styles.typingDot, { opacity: 0.6 }]} />
            <View style={[styles.typingDot, { opacity: 0.3 }]} />
          </View>
        )}

        {/* Bandeau édition en cours */}
        {editingMessage && (
          <View style={styles.editBanner}>
            <Ionicons name="create-outline" size={16} color={COLORS.primary} />
            <Text style={styles.editBannerText} numberOfLines={1}>
              {t("editingMessageBanner")}
            </Text>
            <TouchableOpacity onPress={cancelEdit}>
              <Ionicons name="close" size={18} color="#888" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {isRecording ? (
            <View style={styles.recordingBar}>
              <TouchableOpacity onPress={cancelRecording} style={styles.inputIconBtn}>
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>{formatRecordDuration(recordSeconds)}</Text>
              </View>
              <TouchableOpacity onPress={stopRecordingAndSend} style={styles.sendBtn}>
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity onPress={() => setShowEmoji(true)} style={styles.inputIconBtn}>
                <Ionicons name="happy-outline" size={22} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={pickImage} style={styles.inputIconBtn}>
                <Ionicons name="image-outline" size={22} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={pickDocument} style={styles.inputIconBtn}>
                <Ionicons name="attach-outline" size={22} color={COLORS.primary} />
              </TouchableOpacity>
              <TextInput
                value={text}
                onChangeText={handleTyping}
                placeholder={t("writeMessagePlaceholder")}
                placeholderTextColor="#9a9a9e"
                style={styles.textInput}
                multiline
              />
              {text.trim() ? (
                <TouchableOpacity
                  onPress={sendText}
                  disabled={sending}
                  style={[styles.sendBtn, { backgroundColor: sending ? "#e2e2e6" : COLORS.primary }]}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={startRecording}
                  style={[styles.sendBtn, { backgroundColor: COLORS.primary }]}
                >
                  <Ionicons name="mic" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ✅ NOUVEAU : clavier emoji complet (recherche + toutes les catégories Unicode),
          remplace l'ancienne barre de 30 emojis fixes. */}
      <EmojiPicker
        open={showEmoji}
        onClose={() => setShowEmoji(false)}
        onEmojiSelected={(emojiObject) => insertEmoji(emojiObject.emoji)}
      />

      {/* Menu Modifier / Supprimer */}
      <Modal
        visible={!!actionMsg}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMsg(null)}
      >
        <Pressable style={styles.actionOverlay} onPress={() => setActionMsg(null)}>
          <Pressable style={styles.actionSheet} onPress={(e) => e.stopPropagation()}>
            {actionMsg?.type === "text" && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  setEditingMessage(actionMsg);
                  setText(actionMsg.content || "");
                  setActionMsg(null);
                }}
              >
                <Ionicons name="create-outline" size={20} color="#111" />
                <Text style={styles.actionBtnText}>{t("editAction")}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDelete(actionMsg)}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={[styles.actionBtnText, { color: "#ef4444" }]}>{t("delete")}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f7f7f9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerBackBtn: { padding: 4, marginRight: 4 },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center" },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#eee" },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#fff",
  },
  headerName: { fontWeight: "700", fontSize: 15, color: "#111" },
  headerStatus: { fontSize: 12, color: "#8a8a8e", marginTop: 1 },
  headerActions: { flexDirection: "row" },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f2f2f5",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  listContent: { padding: 12, paddingBottom: 20, flexGrow: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100 },
  emptyStateText: { color: "#9a9a9e", fontWeight: "600", marginTop: 10, fontSize: 14 },
  emptyStateSubtext: { color: "#c2c2c6", fontSize: 12, marginTop: 4 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 6 },
  messageAvatarSlot: { width: 28, marginRight: 6 },
  messageAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#eee" },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "75%",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleMine: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  bubbleTextMine: { color: "#fff", fontSize: 14.5, lineHeight: 20 },
  bubbleTextTheirs: { color: "#1c1c1e", fontSize: 14.5, lineHeight: 20 },
  bubbleImage: { width: 200, height: 200, borderRadius: 12 },
  audioRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  fileRow: { flexDirection: "row", alignItems: "center" },
  fileIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  statusRow: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", marginTop: 4 },
  timestamp: { fontSize: 10 },
  typingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 6,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#aaa",
    marginRight: 4,
  },
  editBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f2f2f5",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  editBannerText: { flex: 1, marginLeft: 8, color: COLORS.primary, fontWeight: "600", fontSize: 12.5 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  inputIconBtn: { padding: 6, marginRight: 2 },
  textInput: {
    flex: 1,
    backgroundColor: "#f2f2f5",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14.5,
    maxHeight: 100,
    marginHorizontal: 6,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingBar: { flexDirection: "row", alignItems: "center", flex: 1 },
  recordingIndicator: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f2f2f5",
    borderRadius: 20,
    paddingVertical: 9,
    marginHorizontal: 6,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
    marginRight: 8,
  },
  recordingText: { color: "#111", fontWeight: "600" },
  actionOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 10,
    paddingBottom: 24,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  actionBtnText: { marginLeft: 12, fontSize: 15, fontWeight: "600", color: "#111" },
});