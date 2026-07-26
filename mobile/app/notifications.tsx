import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import Header from "@/components/Header";
import { COLORS } from "@/constants";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/constants/api";
import { useRouter, useFocusEffect } from "expo-router";
import { useNotifications } from "@/context/NotificationContext";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Toast from "react-native-toast-message";

const POLL_INTERVAL = 15000;

interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  type: "new_product" | "daily_reminder" | "order" | "general" | "offer";
  data?: { productId?: string; offerId?: string; offerCode?: string; [key: string]: any };
  isRead: boolean;
  createdAt: string;
}

const ICONS_BY_TYPE: Record<string, keyof typeof Ionicons.glyphMap> = {
  new_product: "pricetag-outline",
  daily_reminder: "sunny-outline",
  order: "cube-outline",
  general: "notifications-outline",
  offer: "pricetag-outline",
};

function timeAgo(dateString: string, locale: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return locale === "fr" ? "À l'instant" : "Just now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}j`;
}

export default function NotificationsScreen() {
  const { t, language } = useLanguage();
  const { getToken } = useAuth();
  const router = useRouter();
  const { refreshUnreadCount, refreshTrigger } = useNotifications();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [notificationToDelete, setNotificationToDelete] =
    useState<NotificationItem | null>(null);
  const [deletingOne, setDeletingOne] = useState(false);

  const [clearAllModalVisible, setClearAllModalVisible] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  
  const fetchRequestId = useRef(0);

  const fetchNotifications = useCallback(async () => {
    const requestId = ++fetchRequestId.current;
    try {
      const token = await getToken();
      const res = await api.get("/notifications", {
   
        params: { _t: Date.now() },
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

    
      if (requestId !== fetchRequestId.current) {
        console.log("⏭️ fetchNotifications ignoré (obsolète)");
        return;
      }

      console.log(
        "📥 fetchNotifications OK — count:",
        res.data.data?.length,
        "unread:",
        res.data.unreadCount
      );
      setNotifications(res.data.data);
    } catch (error: any) {
      console.error(
        "FETCH NOTIFICATIONS ERROR:",
        error?.response?.status,
        error?.response?.data || error.message
      );
    } finally {
      if (requestId === fetchRequestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [getToken]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );


  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log("🔔 refreshTrigger changé, refetch de la liste");
      fetchNotifications();
    }
  }, [refreshTrigger, fetchNotifications]);


  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handlePress = async (item: NotificationItem) => {
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
      );
      try {
        const token = await getToken();
        await api.put(`/notifications/${item._id}/read`, null, {
          headers: { Authorization: `Bearer ${token}` },
        });
        refreshUnreadCount();
      } catch (error) {
        console.error("MARK READ ERROR:", error);
      }
    }

    if (item.type === "new_product" && item.data?.productId) {
      router.push({
        pathname: "/product/[id]",
        params: { id: String(item.data.productId) },
      });
    }


    if (item.type === "offer") {
      router.push("/offers" as any);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      const token = await getToken();
      await api.put("/notifications/read-all", null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      refreshUnreadCount();

      await fetchNotifications();
    } catch (error) {
      console.error("MARK ALL READ ERROR:", error);
      fetchNotifications();
    }
  };

  const handleAskDelete = (item: NotificationItem) => {
    setNotificationToDelete(item);
  };

  const performDeleteOne = async () => {
    if (!notificationToDelete) return;
    const id = notificationToDelete._id;
    setDeletingOne(true);
  
    fetchRequestId.current++;

    try {
      const token = await getToken();
      const res = await api.delete(`/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("🗑️ DELETE notif réponse:", res.status, res.data);

      
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      refreshUnreadCount();

     
      await fetchNotifications();
    } catch (error: any) {
      console.error(
        "DELETE NOTIFICATION ERROR:",
        error?.response?.status,
        error?.response?.data || error.message
      );
      Toast.show({
        type: "error",
        text1: t("error") ?? "Erreur",
        text2:
          error?.response?.data?.message ||
          t("deleteNotificationError") ||
          "Impossible de supprimer la notification",
      });
     
      fetchNotifications();
    } finally {
      setDeletingOne(false);
      setNotificationToDelete(null);
    }
  };

  const handleAskClearAll = () => {
    setClearAllModalVisible(true);
  };

  const performClearAll = async () => {
    setClearingAll(true);
    fetchRequestId.current++;

    try {
      const token = await getToken();
      const res = await api.delete("/notifications/clear-all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("🗑️ CLEAR ALL réponse:", res.status, res.data);

      setNotifications([]);
      refreshUnreadCount();

      await fetchNotifications();
    } catch (error: any) {
      console.error(
        "CLEAR ALL NOTIFICATIONS ERROR:",
        error?.response?.status,
        error?.response?.data || error.message
      );
      Toast.show({
        type: "error",
        text1: t("error") ?? "Erreur",
        text2:
          error?.response?.data?.message ||
          t("clearAllError") ||
          "Impossible d'effacer les notifications",
      });
      fetchNotifications();
    } finally {
      setClearingAll(false);
      setClearAllModalVisible(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
        <Header title={t("notifications")} showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={t("notifications")} showBack />

      {notifications.length > 0 && (
        <View className="flex-row justify-between items-center px-4 pt-3">
          <Text className="text-secondary text-xs">
            {unreadCount > 0
              ? `${unreadCount} ${t("unread") ?? "non lue(s)"}`
              : t("allCaughtUp") ?? "Tout est lu"}
          </Text>
          <View className="flex-row" style={{ gap: 16 }}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={handleMarkAllRead}>
                <Text className="text-primary text-xs font-bold">
                  {t("markAllRead") ?? "Tout marquer comme lu"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleAskClearAll}>
              <Text className="text-xs font-bold" style={{ color: "#DC2626" }}>
                {t("clearAll") ?? "Effacer tout"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        extraData={notifications}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center mt-20">
            <Ionicons
              name="notifications-off-outline"
              size={48}
              color={COLORS.secondary}
            />
            <Text className="text-secondary mt-4">
              {t("noNotifications") ?? "Aucune notification pour le moment"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            className={`flex-row items-center p-4 rounded-xl mb-2 border ${
              item.isRead
                ? "bg-white border-gray-100"
                : "bg-primary/5 border-primary/20"
            }`}
          >
            <TouchableOpacity
              onPress={() => handlePress(item)}
              className="flex-1 flex-row"
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-3">
                <Ionicons
                  name={ICONS_BY_TYPE[item.type] ?? "notifications-outline"}
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`flex-1 ${
                      item.isRead ? "text-primary" : "text-primary font-bold"
                    }`}
                  >
                    {item.title}
                  </Text>
                  {!item.isRead && (
                    <View className="w-2 h-2 rounded-full bg-primary ml-2" />
                  )}
                </View>
                <Text className="text-secondary text-sm mt-1">{item.body}</Text>
                <Text className="text-secondary text-xs mt-1">
                  {timeAgo(item.createdAt, language)}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleAskDelete(item)}
              className="p-2 ml-2"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>
        )}
      />

      <ConfirmDeleteModal
        visible={!!notificationToDelete}
        title={t("deleteNotification") ?? "Supprimer la notification"}
        message={
          t("deleteNotificationConfirm") ??
          "Cette notification sera supprimée définitivement."
        }
        itemName={notificationToDelete?.title}
        cancelText={t("cancel")}
        confirmText={t("delete") ?? "Supprimer"}
        onCancel={() => setNotificationToDelete(null)}
        onConfirm={performDeleteOne}
        loading={deletingOne}
      />

      <ConfirmDeleteModal
        visible={clearAllModalVisible}
        title={t("clearAll") ?? "Effacer tout"}
        message={
          t("clearAllConfirm") ??
          "Toutes tes notifications seront supprimées définitivement. Cette action est irréversible."
        }
        cancelText={t("cancel")}
        confirmText={t("clearAll") ?? "Effacer tout"}
        onCancel={() => setClearAllModalVisible(false)}
        onConfirm={performClearAll}
        loading={clearingAll}
      />
    </SafeAreaView>
  );
}