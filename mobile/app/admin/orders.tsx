import React, { useEffect, useState } from "react";
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
} from "react-native";
import { COLORS, getStatusColor } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext"; // ← AJOUT

export default function AdminOrders() {
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency(); // ← AJOUT
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);

  // Status Modal State
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  const STATUSES = [
    "placed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];

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

  const fetchOrders = async () => {
    try {
      const token = await getToken();
      const { data } = await api.get("/orders/admin/all", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  const updateStatus = async (newStatus: string) => {
    if (!selectedOrder) return;
    try {
      const token = await getToken();
      const { data } = await api.put(
        `/orders/${selectedOrder._id}/status`,
        {
          orderStatus: newStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (data.success) {
        Alert.alert(t("success"), t("orderStatusUpdated"));
        setStatusModalVisible(false);
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
                        <Text className="text-gray-400">
                          {" "}
                          ({item.size || "-"})
                        </Text>
                      )}
                    </Text>
                    {/* ✅ FIX : prix unitaire formaté selon la devise active */}
                    <Text className="text-secondary text-xs font-bold">
                      {formatPrice(item.price)}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="flex-row justify-between items-center mt-2 pt-3 border-t border-gray-100">
                {/* ✅ FIX : total formaté selon la devise active */}
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

      {/* STATUS MODAL */}
      <Modal visible={statusModalVisible} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={() => setStatusModalVisible(false)}>
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-2xl p-4 max-h-[60%]">
              <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-gray-100">
                <Text className="text-lg font-bold text-primary">
                  {t("updateOrderStatus")}
                </Text>
                <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.secondary} />
                </TouchableOpacity>
              </View>

              {updating ? (
                <View className="py-8">
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text className="text-center text-secondary mt-2">
                    {t("updatingStatus")}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={STATUSES}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className={`p-4 rounded-xl mb-2 flex-row justify-between items-center ${
                        selectedOrder?.orderStatus === item
                          ? "bg-primary/10"
                          : "bg-gray-50"
                      }`}
                      onPress={() => updateStatus(item)}
                    >
                      <Text
                        className={`font-medium ${
                          selectedOrder?.orderStatus === item
                            ? "text-primary font-bold"
                            : "text-secondary"
                        }`}
                      >
                        {getStatusLabel(item)}
                      </Text>
                      {selectedOrder?.orderStatus === item && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={COLORS.primary}
                        />
                      )}
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}