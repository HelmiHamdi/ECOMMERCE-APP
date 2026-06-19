import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Text, TouchableOpacity, View, ActivityIndicator, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import { COLORS, getStatusColor } from "@/constants";
import type { Order } from "@/constants/types";
import { formatDate } from "@/assets/assets";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext"; // ← AJOUT

export default function Orders() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const {getToken} = useAuth()
    const { t } = useLanguage();
    const { formatPrice } = useCurrency(); // ← AJOUT

    const fetchOrders = async () => {
        try {
      const token = await getToken();
      const { data } = await api.get("/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(data.data);
    } catch (error: any) {
    console.error("Error fetching orders:",error)
    } finally {
      setLoading(false);
    }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "placed": return t("statusPlaced");
            case "processing": return t("statusProcessing");
            case "shipped": return t("statusShipped");
            case "delivered": return t("statusDelivered");
            case "cancelled": return t("statusCancelled");
            default: return status;
        }
    };

    const getPaymentStatusLabel = (status: string) => {
        switch (status) {
            case "paid": return t("paymentStatusPaid");
            case "pending": return t("paymentStatusPending");
            case "failed": return t("paymentStatusFailed");
            case "refunded": return t("paymentStatusRefunded");
            default: return status;
        }
    };

    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case "cod": return t("paymentMethodCod");
            case "card": return t("paymentMethodCard");
            case "stripe": return t("paymentMethodCard");
            case "paypal": return t("paymentMethodPaypal");
            default: return method;
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
            <Header title={t("myOrders")} showBack />

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : orders.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                    <Text className="text-secondary text-lg">{t("noOrdersFound")}</Text>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity
                            className="bg-white p-4 rounded-xl mb-4 border border-gray-100 shadow-sm"
                            onPress={() => router.push(`/orders/${item._id}`)}
                        >
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-primary font-bold">{t("order")} #{item.orderNumber}</Text>
                                <Text className="text-secondary text-sm">{formatDate(item.createdAt)}</Text>
                            </View>

                            {/* Status Badges */}
                            <View className="flex-row gap-2 mb-3">
                                <View className={`px-2 py-1 rounded-full ${getStatusColor(item.orderStatus)}`}>
                                    <Text className={`text-xs font-bold`}>
                                        {getStatusLabel(item.orderStatus)}
                                    </Text>
                                </View>

                                <View className={`px-2 py-1 rounded-full ${item.paymentStatus === 'paid' ? 'bg-green-100' : 'bg-gray-100'
                                    }`}>
                                    <Text className={`text-xs font-bold ${item.paymentStatus === 'paid' ? 'text-green-700' : 'text-gray-700'
                                        }`}>
                                        {getPaymentStatusLabel(item.paymentStatus)}
                                    </Text>
                                </View>
                            </View>

                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-secondary text-xs">{t("paymentMethod")}: <Text className="text-primary font-medium">{getPaymentMethodLabel(item.paymentMethod)}</Text></Text>
                            </View>

                            {/* Product Images */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                                {item.items.map((prod: any, idx) => {
                                    const image = prod.product?.images?.[0];
                                    return (
                                        <View key={idx} className="mr-3 border border-gray-100 rounded-md p-1 bg-gray-50">
                                            {image ? (
                                                <Image
                                                    source={{ uri: image }}
                                                    className="w-12 h-12 rounded-md"
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View className="w-12 h-12 bg-gray-200 rounded-md justify-center items-center">
                                                    <Ionicons name="image-outline" size={20} color={COLORS.secondary} />
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </ScrollView>

                            <View className="flex-row justify-between items-center mt-2 pt-3 border-t border-gray-100">
                                <Text className="text-secondary">{t("itemsLabel")}: {item.items.length}</Text>
                                {/* ✅ FIX : montant formaté selon la devise active */}
                                <Text className="text-primary font-bold text-lg">{formatPrice(item.totalAmount)}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </SafeAreaView>
    );
}