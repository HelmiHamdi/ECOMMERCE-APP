import React, { useEffect, useState, useRef } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  Animated,
} from "react-native";
import { COLORS, getStatusColor } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";


const STATUS_META: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  placed: { icon: "receipt-outline", color: "#F59E0B", bg: "#FEF3C7" },
  processing: { icon: "sync-outline", color: "#3B82F6", bg: "#DBEAFE" },
  shipped: { icon: "car-outline", color: "#8B5CF6", bg: "#EDE9FE" },
  delivered: { icon: "checkmark-done-outline", color: "#10B981", bg: "#D1FAE5" },
  cancelled: { icon: "close-circle-outline", color: "#EF4444", bg: "#FEE2E2" },
};

export default function AdminOrders() {
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  // --- Overlay de succès animé ---
  const [successVisible, setSuccessVisible] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string>("placed");
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const STATUSES = ["placed", "processing", "shipped", "delivered", "cancelled"];

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "placed":
        return t("statusPlaced");
      case "processing":
        return t("statusProcessing");
      case "shipped":
        return t("statusShipped");
      case "delivered":
        return t("statusDelivered");
      case "cancelled":
        return t("statusCancelled");
      default:
        return status;
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case "placed":
        return t("statusPlacedDesc") || t("statusPlaced");
      case "processing":
        return t("statusProcessingDesc") || t("statusProcessing");
      case "shipped":
        return t("statusShippedDesc") || t("statusShipped");
      case "delivered":
        return t("statusDeliveredDesc") || t("statusDelivered");
      case "cancelled":
        return t("statusCancelledDesc") || t("statusCancelled");
      default:
        return "";
    }
  };

  const fetchOrders = async () => {
    try {
      const token = await getToken();
      const { data } = await api.get("/orders/admin/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setOrders(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch orders : ", error);
      Alert.alert(t("error"), t("failedToLoadOrders"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const openStatusModal = (order: any) => {
    setSelectedOrder(order);
    setStatusModalVisible(true);
  };

  const showSuccessOverlay = (newStatus: string) => {
    setSuccessStatus(newStatus);
    setSuccessVisible(true);
    successScale.setValue(0);
    successOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(successOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => setSuccessVisible(false));
      }, 1100);
    });
  };

  const updateStatus = async (newStatus: string) => {
    if (!selectedOrder) return;
    setUpdating(true);
    try {
      const token = await getToken();
      const { data } = await api.put(
        `/orders/${selectedOrder._id}/status`,
        { orderStatus: newStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (data.success) {
        setStatusModalVisible(false);
        showSuccessOverlay(newStatus);
        fetchOrders();
      }
    } catch (error: any) {
      console.error("Failed to update status: ", error);
      Alert.alert(t("error"), t("failedToUpdateStatus"));
    } finally {
      setUpdating(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {orders.length === 0 ? (
          <View className="flex-1 justify-center items-center mt-20">
            <Text className="text-secondary">{t("noOrdersFound")}</Text>
          </View>
        ) : (
          orders.map((order: any) => (
            <View
              key={order._id}
              className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100"
            >
              <View className="flex-row justify-between mb-2">
                <Text className="font-medium text-sm text-gray-400 ">
                  {t("orderId")} : #{order._id}
                </Text>
                <Text className="text-secondary text-xs">
                  {new Date(order.createdAt).toLocaleDateString()}
                </Text>
              </View>

              <View className="mb-3 bg-gray-50 p-3 rounded-lg">
                <Text className="text-xs text-secondary font-bold mb-1">
                  {t("customer")}
                </Text>
                <Text className="text-primary font-medium">
                  {order.user?.name || t("unknownUser")}
                </Text>
                <Text className="text-secondary text-xs">
                  {order.user?.email || t("noEmail")}
                </Text>
                {!order.user && (
                  <Text className="text-xs text-gray-400 mt-1">
                    {t("id")}: {order.user?._id || t("na")}
                  </Text>
                )}
              </View>

              <View className="mb-3 bg-gray-50 p-3 rounded-lg">
                <Text className="text-xs text-secondary font-bold mb-1">
                  {t("shippingAddress")}
                </Text>
                <Text className="text-primary text-xs">
                  {order.shippingAddress?.street}, {order.shippingAddress?.city}
                </Text>
                <Text className="text-primary text-xs">
                  {order.shippingAddress?.state},{" "}
                  {order.shippingAddress?.zipCode},{" "}
                  {order.shippingAddress?.country}
                </Text>
              </View>

              <View className="mb-3">
                <Text className="text-xs text-secondary font-bold mb-2">
                  {t("items")}
                </Text>
                {order.items.map((item: any) => (
                  <View
                    key={item._id}
                    className="flex-row justify-between mb-1"
                  >
                    <Text className="text-secondary text-xs flex-1">
                      {item.quantity}x {item.product?.name || item.name}
                      {item.size && (
                        <Text className="text-gray-400"> ({item.size || "-"})</Text>
                      )}
                    </Text>
                    <Text className="text-secondary text-xs font-bold">
                      {formatPrice(item.price)}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="flex-row justify-between items-center mt-2 pt-3 border-t border-gray-100">
                <Text className="text-primary font-bold text-lg">
                  {formatPrice(order.totalAmount)}
                </Text>

                <TouchableOpacity
                  onPress={() => openStatusModal(order)}
                  className={`flex-row items-center px-4 py-2 rounded-full ${getStatusColor(order.orderStatus)}`}
                >
                  <Text className="text-xs font-bold mr-2 uppercase tracking-wide">
                    {getStatusLabel(order.orderStatus)}
                  </Text>
                  <Ionicons
                    name="pencil"
                    size={12}
                    color="black"
                    style={{ opacity: 0.5 }}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

     
      <Modal visible={statusModalVisible} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setStatusModalVisible(false)}>
          <View className="flex-1 justify-end bg-black/50 mb-10">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-5 max-h-[70%]">
                <View className="items-center mb-1">
                  <View className="w-10 h-1 rounded-full bg-gray-200" />
                </View>

                <View className="flex-row justify-between items-center mb-4 mt-3 pb-4 border-b border-gray-100">
                  <View>
                    <Text className="text-lg font-bold text-primary">
                      {t("updateOrderStatus")}
                    </Text>
                    <Text className="text-xs text-secondary mt-0.5">
                      #{selectedOrder?._id?.slice(-8)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setStatusModalVisible(false)}
                    className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center"
                  >
                    <Ionicons name="close" size={18} color={COLORS.secondary} />
                  </TouchableOpacity>
                </View>

                {updating ? (
                  <View className="py-10">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text className="text-center text-secondary mt-3">
                      {t("updatingStatus")}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={STATUSES}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => {
                      const meta = STATUS_META[item];
                      const isActive = selectedOrder?.orderStatus === item;
                      return (
                        <TouchableOpacity
                          className={`p-3 rounded-2xl mb-2 flex-row items-center border ${
                            isActive
                              ? "border-primary bg-primary/5"
                              : "border-gray-100 bg-gray-50"
                          }`}
                          onPress={() => updateStatus(item)}
                          activeOpacity={0.7}
                        >
                          <View
                            className="w-11 h-11 rounded-full items-center justify-center mr-3"
                            style={{ backgroundColor: meta.bg }}
                          >
                            <Ionicons name={meta.icon} size={20} color={meta.color} />
                          </View>

                          <View className="flex-1">
                            <Text
                              className={`font-bold ${
                                isActive ? "text-primary" : "text-primary/80"
                              }`}
                            >
                              {getStatusLabel(item)}
                            </Text>
                            <Text className="text-secondary text-xs mt-0.5">
                              {getStatusDescription(item)}
                            </Text>
                          </View>

                          {isActive && (
                            <Ionicons
                              name="checkmark-circle"
                              size={22}
                              color={COLORS.primary}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    
      {successVisible && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <Animated.View
            style={{
              opacity: successOpacity,
              transform: [{ scale: successScale }],
              backgroundColor: "white",
              paddingVertical: 24,
              paddingHorizontal: 32,
              borderRadius: 24,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: STATUS_META[successStatus]?.bg,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons
                name="checkmark"
                size={34}
                color={STATUS_META[successStatus]?.color}
              />
            </View>
            <Text className="text-primary font-bold text-base">
              {t("orderStatusUpdated")}
            </Text>
            <Text className="text-secondary text-xs mt-1">
              {getStatusLabel(successStatus)}
            </Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
}