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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import api from "@/constants/api";
import { useSocket } from "@/context/SocketContext";
import { COLORS } from "@/constants";

export default function ChatScreen() {
  const { id: conversationId, otherId } = useLocalSearchParams<{
    id: string;
    otherId?: string;
  }>();
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { socket } = useSocket();

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const listRef = useRef<FlatList>(null);
  const typingTimeout = useRef<any>(null);

  // otherId vient des params de route (passé depuis la liste des conversations);
  // fallback sur le sender du premier message d'autrui si jamais il manque.
  const otherParticipantId =
    otherId || messages.find((m) => m.sender?._id !== user?.id)?.sender?._id;

  const loadMessages = useCallback(async () => {
    const token = await getToken();
    if (!token || !conversationId) return;
    const res = await api.get(`/chatAdmin/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setMessages(res.data?.data || []);
  }, [getToken, conversationId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = ({ conversationId: cid, message }: any) => {
      if (cid !== conversationId) return;
      setMessages((prev) => [...prev, message]);
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

    socket.on("message:new", onNewMessage);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("conversation:removed", onConversationRemoved);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("conversation:removed", onConversationRemoved);
    };
  }, [socket, conversationId, router]);

  const handleTyping = (val: string) => {
    setText(val);
    if (!socket || !otherParticipantId) return;
    socket.emit("typing:start", { conversationId, toUserId: otherParticipantId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing:stop", { conversationId, toUserId: otherParticipantId });
    }, 1500);
  };

  const sendText = async () => {
    if (!text.trim()) return;
    const token = await getToken();
    if (!token || !conversationId) return;
    const content = text.trim();
    setText("");
    await api.post(
      `/chatAdmin/conversations/${conversationId}/messages`,
      { type: "text", content },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    loadMessages();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];

    const formData = new FormData();
    formData.append("type", "image");
    formData.append("file", {
      uri: asset.uri,
      name: asset.fileName || "image.jpg",
      type: "image/jpeg",
    } as any);

    const token = await getToken();
    if (!token || !conversationId) return;
    // Ne pas fixer Content-Type manuellement: axios/React Native doit générer
    // lui-même le boundary multipart, sinon l'upload échoue côté multer.
    await api.post(`/chatAdmin/conversations/${conversationId}/messages`, formData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    loadMessages();
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (result.canceled) return;
    const asset = result.assets[0];

    const formData = new FormData();
    formData.append("type", "file");
    formData.append("file", {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || "application/octet-stream",
    } as any);

    const token = await getToken();
    if (!token || !conversationId) return;
    await api.post(`/chatAdmin/conversations/${conversationId}/messages`, formData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    loadMessages();
  };

  const startCall = (kind: "audio" | "video") => {
    if (!otherParticipantId) return;
    router.push({
      pathname: `/admin/chatAdmin/call/${conversationId}` as any,
      params: { toUserId: otherParticipantId, kind, mode: "outgoing" },
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          padding: 10,
          borderBottomWidth: 1,
          borderBottomColor: "#f0f0f0",
        }}
      >
        <TouchableOpacity onPress={() => startCall("audio")} style={{ marginRight: 20 }}>
          <Ionicons name="call-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => startCall("video")}>
          <Ionicons name="videocam-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m._id}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.sender?._id === user?.id;
          return (
            <View
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                backgroundColor: mine ? COLORS.primary : "#f0f0f0",
                borderRadius: 16,
                padding: 10,
                marginBottom: 8,
                maxWidth: "75%",
              }}
            >
              {item.type === "text" && (
                <Text style={{ color: mine ? "#fff" : "#000" }}>{item.content}</Text>
              )}
              {item.type === "image" && (
                <Image
                  source={{ uri: item.fileUrl }}
                  style={{ width: 200, height: 200, borderRadius: 10 }}
                />
              )}
              {item.type === "file" && (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="document-outline"
                    size={20}
                    color={mine ? "#fff" : "#000"}
                  />
                  <Text style={{ color: mine ? "#fff" : "#000", marginLeft: 6 }}>
                    {item.fileName}
                  </Text>
                </View>
              )}
              {item.type === "call" && (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name={item.callKind === "video" ? "videocam-outline" : "call-outline"}
                    size={18}
                    color={mine ? "#fff" : "#000"}
                  />
                  <Text style={{ color: mine ? "#fff" : "#000", marginLeft: 6 }}>
                    Appel {item.callStatus} ({item.callDurationSec || 0}s)
                  </Text>
                </View>
              )}
            </View>
          );
        }}
      />

      {otherTyping && (
        <Text style={{ paddingHorizontal: 16, color: "#999", fontSize: 12 }}>
          en train d&apos;écrire...
        </Text>
      )}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 10,
          borderTopWidth: 1,
          borderTopColor: "#f0f0f0",
        }}
      >
        <TouchableOpacity onPress={pickImage} style={{ marginRight: 10 }}>
          <Ionicons name="image-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={pickDocument} style={{ marginRight: 10 }}>
          <Ionicons name="attach-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <TextInput
          value={text}
          onChangeText={handleTyping}
          placeholder="Écrire un message..."
          style={{
            flex: 1,
            backgroundColor: "#f2f2f3",
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        />
        <TouchableOpacity onPress={sendText} style={{ marginLeft: 10 }}>
          <Ionicons name="send" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}