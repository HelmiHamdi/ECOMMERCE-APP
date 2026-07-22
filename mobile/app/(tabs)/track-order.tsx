import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import Header from "@/components/Header";
import { COLORS } from "@/constants";
import { useAuth } from "@clerk/clerk-expo";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/constants/api";

const SURFACE = "#F5F5F8";
const INK = "#13131A";
const MUTED = "#8D8D96";


type OrderStatus =
  | "placed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

type Order = {
  _id: string;
  orderStatus: OrderStatus;
  total: number;
  createdAt: string;
  items: { name: string; quantity: number }[];
};


const STEPS: { key: OrderStatus; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "placed", labelKey: "stepConfirmed", icon: "checkmark-circle-outline" },
  { key: "processing", labelKey: "stepProcessing", icon: "cube-outline" },
  { key: "shipped", labelKey: "stepShipped", icon: "airplane-outline" },
  { key: "delivered", labelKey: "stepDelivered", icon: "home-outline" },
];

function StatusTimeline({ status, t }: { status: OrderStatus; t: (key: string) => string | undefined }) {
  if (status === "cancelled") {
    return (
      <View className="flex-row items-center mt-3">
        <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
        <Text className="ml-2 font-semibold" style={{ color: "#EF4444" }}>
          {t("orderCancelled") ?? "Commande annulée"}
        </Text>
      </View>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <View className="flex-row items-center mt-4">
      {STEPS.map((step, index) => {
        const reached = index <= currentIndex;
        return (
          <React.Fragment key={step.key}>
            <View className="items-center" style={{ width: 64 }}>
              <View
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{
                  backgroundColor: reached ? COLORS.primary : "#E5E5E7",
                }}
              >
                <Ionicons
                  name={step.icon}
                  size={16}
                  color={reached ? "#fff" : MUTED}
                />
              </View>
              <Text
                className="text-[10px] text-center mt-1"
                style={{ color: reached ? COLORS.primary : MUTED, fontWeight: reached ? "700" : "400" }}
              >
                {t(step.labelKey) ?? step.labelKey}
              </Text>
            </View>
            {index < STEPS.length - 1 && (
              <View
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: index < currentIndex ? COLORS.primary : "#E5E5E7",
                  marginBottom: 16,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function TrackOrderScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { t } = useLanguage();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const token = await getToken();
      const res = await api.get("/orders/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const onRefresh = () => {
    loadOrders(true);
  };

  const renderItem = ({ item }: { item: Order }) => (
    <View
      className="mx-4 mb-4 rounded-2xl p-4"
      style={{ backgroundColor: SURFACE }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-bold" style={{ color: INK }}>
          {t("order") ?? "Commande"} #{item._id.slice(-6).toUpperCase()}
        </Text>
        <Text className="text-[12px]" style={{ color: MUTED }}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <Text className="text-[13px] mt-1" style={{ color: MUTED }}>
        {item.items?.length ?? 0} {t("items") ?? "article(s)"} • {item.total} DT
      </Text>

      <StatusTimeline status={item.orderStatus} t={t} />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Header title={t("trackOrder") ?? "Suivre ma commande"} showBack />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cube-outline" size={48} color={MUTED} />
          <Text className="text-center mt-4" style={{ color: MUTED }}>
            {t("noOrdersYet") ?? "Vous n'avez pas encore de commande"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}