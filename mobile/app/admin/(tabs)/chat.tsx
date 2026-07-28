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
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "@/constants/api";
import { useSocket } from "@/context/SocketContext";
import { useMyMongoUser } from "@/app/hooks/useMyMongoUser";
import { useLanguage } from "@/context/LanguageContext";
import { COLORS } from "@/constants";

export default function AdminChatListScreen() {
  const { getToken } = useAuth();
  const { myId } = useMyMongoUser(); // ✅ id Mongo réel, pas l'id Clerk
  const router = useRouter();
  const { socket, onlineUserIds } = useSocket();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

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
        if (message.sender?._id !== myId) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }
        updated.splice(idx, 1);
        return [conv, ...updated];
      });
    };

    const onConversationRemoved = ({ conversationId }: any) => {
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
    };

    socket.on("message:new", onNewMessage);
    socket.on("conversation:removed", onConversationRemoved);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("conversation:removed", onConversationRemoved);
    };
  }, [socket, myId, loadConversations]);

  // ✅ Corrigé : on compare avec myId (Mongo), plus jamais avec l'id Clerk.
  // C'est ce qui garantissait auparavant de retomber tout le temps sur le même admin.
  const getOtherParticipant = (conv: any) =>
    conv.participants?.find((p: any) => p._id !== myId);

  const openConversation = (conv: any) => {
    const other = getOtherParticipant(conv);
    router.push({
      pathname: `/admin/chat/${conv._id}` as any,
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
        pathname: `/admin/chat/${res.data.data._id}` as any,
        params: { otherId: adminId },
      });
    } catch (err) {
      console.error("Erreur création conversation:", err);
    }
  };

  const formatPreviewTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    return sameDay
      ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>{t("messages") || "Messages"}</Text>
      </View>

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
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>
                {t("noConversationsYet") || "Aucune conversation pour le moment"}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {t("tapPlusToStart") || "Appuyez sur + pour en démarrer une"}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const other = getOtherParticipant(item);
          const isOnline = other && onlineUserIds.has(other._id);
          const hasUnread = item.unreadCount > 0;
          return (
            <TouchableOpacity
              onPress={() => openConversation(item)}
              activeOpacity={0.7}
              style={styles.row}
            >
              <View>
                <Image
                  source={{ uri: other?.image || "https://placehold.co/48" }}
                  style={styles.rowAvatar}
                />
                {isOnline && <View style={styles.rowOnlineDot} />}
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTopLine}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {other?.name || other?.email || t("admin") || "Admin"}
                  </Text>
                  <Text style={styles.rowTime}>
                    {formatPreviewTime(item.lastMessageAt)}
                  </Text>
                </View>
                <View style={styles.rowBottomLine}>
                  <Text
                    numberOfLines={1}
                    style={[styles.rowPreview, hasUnread && styles.rowPreviewUnread]}
                  >
                    {item.lastMessage || t("startConversation") || "Démarrer la conversation"}
                  </Text>
                  {hasUnread && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity
        onPress={() => {
          loadAdmins();
          setNewChatVisible(true);
        }}
        style={[styles.fab, { bottom: insets.bottom + 90 }]}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={newChatVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setNewChatVisible(false)}>
          <Pressable
            style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {t("newConversation") || "Nouvelle conversation"}
              </Text>
              <TouchableOpacity onPress={() => setNewChatVisible(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {t("chooseAnAdmin") || "Choisissez un administrateur"}
            </Text>

            <FlatList
              data={admins}
              keyExtractor={(a) => a._id}
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 12 }}
              renderItem={({ item }) => {
                const isOnline = onlineUserIds.has(item._id);
                return (
                  <TouchableOpacity
                    onPress={() => startNewChat(item._id)}
                    activeOpacity={0.7}
                    style={styles.adminRow}
                  >
                    <View>
                      <Image
                        source={{ uri: item.image || "https://placehold.co/44" }}
                        style={styles.adminAvatar}
                      />
                      {isOnline && <View style={styles.rowOnlineDot} />}
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.adminName}>{item.name || item.email}</Text>
                      <Text style={styles.adminStatus}>
                        {isOnline
                          ? t("online") || "En ligne"
                          : t("offline") || "Hors ligne"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#c4c4c8" />
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    {t("noOtherAdmins") || "Aucun autre administrateur"}
                  </Text>
                </View>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  pageTitle: { fontSize: 24, fontWeight: "800", color: "#111" },
  listContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 120 },
  emptyState: { alignItems: "center", marginTop: 80 },
  emptyStateText: { color: "#999", marginTop: 8, fontWeight: "600" },
  emptyStateSubtext: { color: "#c2c2c6", fontSize: 12, marginTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f6",
  },
  rowAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#eee" },
  rowOnlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#fff",
  },
  rowBody: { flex: 1, marginLeft: 12 },
  rowTopLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowName: { fontWeight: "700", fontSize: 15, color: "#111", flexShrink: 1 },
  rowTime: { fontSize: 11, color: "#aaa", marginLeft: 6 },
  rowBottomLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 3,
  },
  rowPreview: { color: "#8a8a8e", fontSize: 13, flex: 1, marginRight: 8 },
  rowPreviewUnread: { color: "#333", fontWeight: "600" },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    height: "85%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e0e0e4",
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { fontWeight: "800", fontSize: 18, color: "#111" },
  modalSubtitle: { color: "#9a9a9e", fontSize: 13, marginTop: 4 },
  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f6",
  },
  adminAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#eee" },
  adminName: { fontWeight: "700", fontSize: 14.5, color: "#111" },
  adminStatus: { fontSize: 12, color: "#9a9a9e", marginTop: 2 },
});