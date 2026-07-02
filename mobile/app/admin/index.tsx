import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, getStatusColor } from "@/constants";

import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext"; // ← AJOUT

export default function AdminDashboard() {
    const {getToken} = useAuth();
    const router = useRouter();
    const { t } = useLanguage();
    const { formatPrice } = useCurrency(); // ← AJOUT
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        recentOrders: []
    });

    const fetchStats = async () => {
        try {
            const token = await getToken()
            const {data} = await api.get('/admin/stats',{headers:{
                Authorization: `Bearer ${token}`
            }})
            if(data.success){
                setStats(data.data)
            }
        } catch (error) {
            console.error("Failed to fetch admin stats : ", error)
        }
        finally{
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-surface">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-surface"
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
            {/* Header */}
            <View className="mb-6 mt-2">
                <Text className="text-secondary text-xs font-semibold uppercase tracking-widest mb-1">
                    {t("dashboard") || "Tableau de bord"}
                </Text>
                <Text className="text-primary font-extrabold text-3xl tracking-tight">
                    {t("overview")}
                </Text>
            </View>

            {/* Stat cards */}
            <View className="flex-row flex-wrap justify-between mb-8">
                <StatCard
                    label={t("totalRevenue")}
                    value={formatPrice(stats.totalRevenue)}
                    icon="cash-outline"
                    accent="#16A34A"
                    accentBg="#DCFCE7"
                />
                <StatCard
                    label={t("totalOrders")}
                    value={stats.totalOrders.toString()}
                    icon="bag-handle-outline"
                    accent="#2563EB"
                    accentBg="#DBEAFE"
                />
                <StatCard
                    label={t("products")}
                    value={stats.totalProducts.toString()}
                    icon="cube-outline"
                    accent="#D97706"
                    accentBg="#FEF3C7"
                />
                <StatCard
                    label={t("users")}
                    value={stats.totalUsers.toString()}
                    icon="people-outline"
                    accent="#7C3AED"
                    accentBg="#EDE9FE"
                />
            </View>

            {/* Recent orders */}
            <View>
                <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-primary font-extrabold text-2xl tracking-tight">
                        {t("recentOrders")}
                    </Text>
                    {stats.recentOrders.length > 0 && (
                        <View className="bg-gray-100 px-3 py-1 rounded-full">
                            <Text className="text-secondary text-xs font-bold">
                                {stats.recentOrders.length}
                            </Text>
                        </View>
                    )}
                </View>

                {stats.recentOrders.length === 0 ? (
                    <View
                        className="bg-white p-8 rounded-3xl border border-gray-100 items-center"
                        style={{
                            shadowColor: "#000",
                            shadowOpacity: 0.03,
                            shadowRadius: 8,
                            shadowOffset: { width: 0, height: 2 },
                            elevation: 1,
                        }}
                    >
                        <View className="w-14 h-14 rounded-full bg-gray-50 items-center justify-center mb-3">
                            <Ionicons name="receipt-outline" size={26} color="#B0B0B0" />
                        </View>
                        <Text className="text-secondary font-medium">{t("noRecentOrders")}</Text>
                    </View>
                ) : (
                    stats.recentOrders.map((order: any) => {
                        const totalItems = order.items.reduce(
                            (acc: number, item: any) => acc + item.quantity,
                            0
                        );
                        const initial = (order.user?.name || "?").charAt(0).toUpperCase();

                        return (
                            <View
                                key={order._id}
                                className="bg-white rounded-3xl border border-gray-100 mb-4 overflow-hidden"
                                style={{
                                    shadowColor: "#000",
                                    shadowOpacity: 0.04,
                                    shadowRadius: 10,
                                    shadowOffset: { width: 0, height: 3 },
                                    elevation: 2,
                                }}
                            >
                                <View className="p-5">
                                    {/* Top row: item count + status badge */}
                                    <View className="flex-row justify-between items-start mb-4">
                                        <View className="flex-row items-center">
                                            <View className="w-9 h-9 rounded-full bg-primary/5 items-center justify-center mr-2.5">
                                                <Ionicons name="bag-handle-outline" size={16} color={COLORS.primary} />
                                            </View>
                                            <View>
                                                <Text className="font-bold text-primary text-base">
                                                    {totalItems} {t("totalProducts")}
                                                </Text>
                                                <Text className="text-secondary text-xs mt-0.5">
                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                </Text>
                                            </View>
                                        </View>
                                        <View
                                            className={`px-3 py-1.5 rounded-full ${getStatusColor(order.orderStatus)}`}
                                        >
                                            <Text className="text-[10px] font-extrabold uppercase tracking-wide">
                                                {order.orderStatus}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Items list */}
                                    <View className="bg-surface rounded-2xl px-4 py-3 mb-4">
                                        {order.items.map((item: any) => (
                                            <View
                                                key={item._id}
                                                className="flex-row justify-between py-1"
                                            >
                                                <Text
                                                    className="text-secondary text-xs flex-1"
                                                    numberOfLines={1}
                                                >
                                                    {item.name}
                                                </Text>
                                                <Text className="text-secondary text-xs font-semibold ml-2">
                                                    x{item.quantity}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Bottom row: user + total */}
                                    <View className="flex-row justify-between items-center">
                                        <View className="flex-row items-center">
                                            <View className="w-9 h-9 rounded-full bg-primary items-center justify-center mr-2.5">
                                                <Text className="text-white font-bold text-xs">
                                                    {initial}
                                                </Text>
                                            </View>
                                            <Text className="text-secondary text-sm font-medium">
                                                {order.user?.name || t("unknownUser")}
                                            </Text>
                                        </View>
                                        <Text className="text-primary font-extrabold text-lg">
                                            {formatPrice(order.totalAmount)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })
                )}
            </View>
        </ScrollView>
    );
}

const StatCard = ({
    label,
    value,
    icon,
    accent,
    accentBg,
}: {
    label: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
    accentBg: string;
}) => (
    <View
        className="bg-white p-4 rounded-3xl border border-gray-100 w-[48%] mb-4"
        style={{
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
        }}
    >
        <View
            className="w-10 h-10 rounded-2xl items-center justify-center mb-3"
            style={{ backgroundColor: accentBg }}
        >
            <Ionicons name={icon} size={18} color={accent} />
        </View>
        <Text className="text-xl font-extrabold text-primary mb-1" numberOfLines={1}>
            {value}
        </Text>
        <Text className="text-secondary text-[11px] font-semibold uppercase tracking-wide">
            {label}
        </Text>
    </View>
);