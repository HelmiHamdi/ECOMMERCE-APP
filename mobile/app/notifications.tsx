import React, { useState, useEffect, useCallback } from "react";
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
import { useRouter } from "expo-router";
import { useNotifications } from "@/context/NotificationContext";

interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  type: "new_product" | "daily_reminder" | "order" | "general";
  data?: { productId?: string; [key: string]: any };
  isRead: boolean;
  createdAt: string;
}

const ICONS_BY_TYPE: Record<string, keyof typeof Ionicons.glyphMap> = {
  new_product: "pricetag-outline",
  daily_reminder: "sunny-outline",
  order: "cube-outline",
  general: "notifications-outline",
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
  const { refreshUnreadCount } = useNotifications();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await api.get("/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data.data);
    } catch (error) {
      console.error("FETCH NOTIFICATIONS ERROR:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handlePress = async (item: NotificationItem) => {
    // Marquer comme lu localement tout de suite (optimiste)
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
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      const token = await getToken();
      await api.put("/notifications/read-all", null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      refreshUnreadCount();
    } catch (error) {
      console.error("MARK ALL READ ERROR:", error);
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

      {unreadCount > 0 && (
        <View className="flex-row justify-between items-center px-4 pt-3">
          <Text className="text-secondary text-xs">
            {unreadCount} {t("unread") ?? "non lue(s)"}
          </Text>
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text className="text-primary text-xs font-bold">
              {t("markAllRead") ?? "Tout marquer comme lu"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
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
          <TouchableOpacity
            onPress={() => handlePress(item)}
            className={`flex-row p-4 rounded-xl mb-2 border ${
              item.isRead
                ? "bg-white border-gray-100"
                : "bg-primary/5 border-primary/20"
            }`}
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
        )}
      />
    </SafeAreaView>
  );
}