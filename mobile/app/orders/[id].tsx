import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, Text, View, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import { COLORS } from "@/constants";
import type { Order, Product } from "@/constants/types";

import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { downloadInvoice } from "../utils/downloadInvoice";


export default function OrderDetails() {
    const { id } = useLocalSearchParams();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);
    const { getToken } = useAuth();
    const { t } = useLanguage();
    const { formatPrice, currency } = useCurrency(); // ← currency ajouté ici

    const fetchOrderDetails = async () => {
        console.log("📦 ID reçu via params:", id);
        try {
            const token = await getToken();
            console.log("🔑 Token:", token ? "présent" : "absent");
            const { data } = await api.get(`/orders/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setOrder(data.data);
        } catch (error: any) {
            console.error("Error fetching order details:", error.response?.data || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadInvoice = async () => {
        if (!order) return;
        setDownloadingInvoice(true);
        try {
            // ✅ FIX : currency passé → le PDF utilisera $, € ou DT selon la devise active
            await downloadInvoice(order._id, order.orderNumber, getToken, currency);
        } finally {
            setDownloadingInvoice(false);
        }
    };

    useEffect(() => {
        fetchOrderDetails();
    }, [id]);

    const getPaymentStatusLabel = (status: string) => {
        switch (status) {
            case "paid":     return t("paymentStatusPaid");
            case "pending":  return t("paymentStatusPending");
            case "failed":   return t("paymentStatusFailed");
            case "refunded": return t("paymentStatusRefunded");
            default:         return status;
        }
    };

    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case "cod":     return t("paymentMethodCod");
            case "card":    return t("paymentMethodCard");
            case "stripe":  return t("paymentMethodCard");
            case "paypal":  return t("paymentMethodPaypal");
            default:        return method;
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-surface justify-center items-center">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    if (!order) {
        return (
            <SafeAreaView className="flex-1 bg-surface justify-center items-center">
                <Text>{t("orderNotFound")}</Text>
            </SafeAreaView>
        );
    }

    const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const ORDER_STEPS = [
        { title: t("orderPlacedStep"), date: formatDate(order.createdAt), completed: true },
        { title: t("statusProcessing"), date: "", completed: ["processing", "shipped", "delivered"].includes(order.orderStatus) },
        { title: t("statusShipped"),    date: "", completed: ["shipped", "delivered"].includes(order.orderStatus) },
        { title: t("statusDelivered"), date: "", completed: order.orderStatus === "delivered" },
    ];

    return (
        <SafeAreaView className="flex-1 bg-surface" edges={["top", "bottom"]}>
            <Header title={`${t("order")} #${order.orderNumber}`} showBack />

            <ScrollView
                className="flex-1 px-4 pt-4"
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Order Status */}
                <View className="bg-white p-4 rounded-xl mb-4 border border-gray-100">
                    <Text className="text-lg font-bold text-primary mb-4">{t("orderStatus")}</Text>

                    {ORDER_STEPS.map((step, index) => (
                        <View key={index} className="flex-row mb-4 last:mb-0">
                            <View className="items-center mr-4">
                                <View className={`w-3 h-3 rounded-full ${step.completed ? "bg-primary" : "bg-gray-300"}`} />
                                {index !== ORDER_STEPS.length - 1 && (
                                    <View className={`w-0.5 h-full ${step.completed ? "bg-primary" : "bg-gray-300"} absolute top-3`} />
                                )}
                            </View>
                            <View className="pb-4">
                                <Text className={`font-bold ${step.completed ? "text-primary" : "text-gray-400"}`}>{step.title}</Text>
                                {step.date ? <Text className="text-secondary text-xs">{step.date}</Text> : null}
                            </View>
                        </View>
                    ))}
                </View>

                {/* Items */}
                <View className="bg-white p-4 rounded-xl mb-4 border border-gray-100">
                    <Text className="text-lg font-bold text-primary mb-4">{t("products")}</Text>
                    {order.items.map((item: any, index: number) => {
                        const productData = item.product as Product;
                        const image = productData?.images?.[0];

                        return (
                            <View key={index} className={`flex-row ${index !== order.items.length - 1 && "border-b border-gray-100 pb-4 mb-4"}`}>
                                {image && (
                                    <Image
                                        source={{ uri: image }}
                                        className="w-16 h-16 rounded-lg bg-gray-100"
                                        resizeMode="contain"
                                    />
                                )}
                                <View className="flex-1 ml-3 justify-center">
                                    <Text className="text-primary font-medium" numberOfLines={1}>{item.name}</Text>
                                    <Text className="text-secondary text-xs">{t("sizeLabel")}: {item.size}</Text>
                                    <View className="flex-row justify-between items-center mt-2">
                                        <Text className="text-primary font-bold">{formatPrice(item.price)}</Text>
                                        <Text className="text-secondary text-xs">{t("qtyLabel")}: {item.quantity}</Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Shipping Details */}
                <View className="bg-white p-4 rounded-xl mb-4 border border-gray-100">
                    <Text className="text-lg font-bold text-primary mb-2">{t("shippingDetails")}</Text>
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="location-outline" size={20} color={COLORS.secondary} />
                        <Text className="text-secondary ml-2 flex-1">
                            {order.shippingAddress?.street}, {order.shippingAddress?.city},{" "}
                            {order.shippingAddress?.zipCode}, {order.shippingAddress?.country}
                        </Text>
                    </View>
                </View>

                {/* Payment Summary */}
                <View className="bg-white p-4 rounded-xl mb-8 border border-gray-100">
                    <Text className="text-lg font-bold text-primary mb-4">{t("paymentSummary")}</Text>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-secondary">{t("paymentMethod")}</Text>
                        <Text className="text-primary font-medium">{getPaymentMethodLabel(order.paymentMethod)}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-secondary">{t("paymentStatus")}</Text>
                        <Text className={`font-medium ${
                            order.paymentStatus === "paid"   ? "text-green-600" :
                            order.paymentStatus === "failed" ? "text-red-600"   : "text-orange-500"
                        }`}>
                            {getPaymentStatusLabel(order.paymentStatus)}
                        </Text>
                    </View>
                    <View className="h-px bg-gray-100 my-2" />
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-secondary">{t("subtotal")}</Text>
                        <Text className="text-primary font-medium">{formatPrice(order.subtotal)}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-secondary">{t("shippingLabel")}</Text>
                        <Text className="text-primary font-medium">{formatPrice(order.shippingCost)}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-secondary">{t("tax")}</Text>
                        <Text className="text-primary font-medium">{formatPrice(order.tax)}</Text>
                    </View>
                    <View className="h-px bg-gray-100 my-2" />
                    <View className="flex-row justify-between">
                        <Text className="text-primary font-bold text-lg">{t("total")}</Text>
                        <Text className="text-primary font-bold text-lg">{formatPrice(order.totalAmount)}</Text>
                    </View>
                </View>

                {/* Download Invoice Button */}
                <TouchableOpacity
                    onPress={handleDownloadInvoice}
                    disabled={downloadingInvoice}
                    className="flex-row items-center justify-center bg-primary py-3 rounded-xl mb-8"
                >
                    {downloadingInvoice ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <>
                            <Ionicons name="download-outline" size={18} color="white" />
                            <Text className="text-white font-bold ml-2">
                                {t("downloadInvoice") ?? "Télécharger la facture"}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}