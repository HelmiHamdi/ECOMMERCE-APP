import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { useSocket } from "@/context/SocketContext";
import { COLORS } from "@/constants";

export default function AdminChatListScreen() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { socket, onlineUserIds } = useSocket();

  const [conversations, setConversations] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newChatVisible, setNewChatVisible] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await api.get("/chatAdmin/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(res.data?.data || []);
    } catch (err) {
      console.error("Erreur chargement conversations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  const loadAdmins = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await api.get("/chatAdmin/admins", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdmins(res.data?.data || []);
    } catch (err) {
      console.error("Erreur chargement admins:", err);
    }
  }, [getToken]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  // Écoute temps réel: nouveau message -> remonte la conversation en tête + met à jour l'aperçu
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = ({ conversationId, message }: any) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c._id === conversationId);
        if (idx === -1) {
          loadConversations();
          return prev;
        }
        const updated = [...prev];
        const conv = { ...updated[idx] };
        conv.lastMessage =
          message.type === "text" ? message.content : `[${message.type}]`;
        conv.lastMessageAt = message.createdAt;
        if (message.sender?._id !== user?.id) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }
        updated.splice(idx, 1);
        return [conv, ...updated];
      });
    };

    // La conversation d'un admin retiré disparaît instantanément
    const onConversationRemoved = ({ conversationId }: any) => {
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
    };

    socket.on("message:new", onNewMessage);
    socket.on("conversation:removed", onConversationRemoved);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("conversation:removed", onConversationRemoved);
    };
  }, [socket, user?.id, loadConversations]);

  const getOtherParticipant = (conv: any) =>
    conv.participants?.find((p: any) => p._id !== user?.id);

  const openConversation = (conv: any) => {
    const other = getOtherParticipant(conv);
    router.push({
      pathname: `/admin/chatAdmin/${conv._id}` as any,
      params: { otherId: other?._id },
    });
  };

  const startNewChat = async (adminId: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await api.post(
        "/chatAdmin/conversations",
        { participantId: adminId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewChatVisible(false);
      router.push({
        pathname: `/admin/chatAdmin/${res.data.data._id}` as any,
        params: { otherId: adminId },
      });
    } catch (err) {
      console.error("Erreur création conversation:", err);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadConversations();
            }}
          />
        }
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: "center", marginTop: 80 }}>
              <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
              <Text style={{ color: "#999", marginTop: 8 }}>
                Aucune conversation pour le moment
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const other = getOtherParticipant(item);
          const isOnline = other && onlineUserIds.has(other._id);
          return (
            <TouchableOpacity
              onPress={() => openConversation(item)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#f0f0f0",
              }}
            >
              <View>
                <Image
                  source={{ uri: other?.image || "https://placehold.co/48" }}
                  style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#eee" }}
                />
                {isOnline && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: "#22c55e",
                      borderWidth: 2,
                      borderColor: "#fff",
                    }}
                  />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: "700", fontSize: 15 }}>
                  {other?.name || other?.email || "Admin"}
                </Text>
                <Text numberOfLines={1} style={{ color: "#888", marginTop: 2 }}>
                  {item.lastMessage || "Démarrer la conversation"}
                </Text>
              </View>
              {item.unreadCount > 0 && (
                <View
                  style={{
                    backgroundColor: COLORS.primary,
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 5,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                    {item.unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        onPress={() => {
          loadAdmins();
          setNewChatVisible(true);
        }}
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: COLORS.primary,
          alignItems: "center",
          justifyContent: "center",
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={newChatVisible} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={() => setNewChatVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              maxHeight: "60%",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 16 }}>
              Nouvelle conversation
            </Text>
            <FlatList
              data={admins}
              keyExtractor={(a) => a._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => startNewChat(item._id)}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10 }}
                >
                  <Image
                    source={{ uri: item.image || "https://placehold.co/40" }}
                    style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#eee" }}
                  />
                  <Text style={{ marginLeft: 12, fontWeight: "600" }}>
                    {item.name || item.email}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ color: "#999" }}>Aucun autre administrateur</Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}