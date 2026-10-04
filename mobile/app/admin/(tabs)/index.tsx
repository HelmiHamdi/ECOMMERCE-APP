import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ScrollView,
    Text,
    View,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart } from "react-native-chart-kit";
import Svg, { Circle, G } from "react-native-svg";
import { COLORS, getStatusColor } from "@/constants";

import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_WIDTH = SCREEN_WIDTH - 32 - 40; // padding écran (16*2) + padding interne carte (20*2)

type DailyStat = { date: string; revenue: number; orders: number };
type StatusStat = { status: string; count: number };
type TopProduct = { name: string; qty: number };

type ChartsData = {
    dailyStats: DailyStat[];
    statusBreakdown: StatusStat[];
    topProducts: TopProduct[];
};

const STATUS_META: Record<string, { color: string; labelKey: string; fallback: string }> = {
    placed: { color: "#D97706", labelKey: "orderPlaced", fallback: "Passée" },
    pending: { color: "#D97706", labelKey: "orderPlaced", fallback: "Passée" },
    processing: { color: "#2563EB", labelKey: "statusProcessing", fallback: "En traitement" },
    shipped: { color: "#7C3AED", labelKey: "statusShipped", fallback: "Expédiée" },
    delivered: { color: "#16A34A", labelKey: "statusDelivered", fallback: "Livrée" },
    cancelled: { color: "#DC2626", labelKey: "statusCancelled", fallback: "Annulée" },
};

const CARD_SHADOW = {
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
};

export default function AdminDashboard() {
    const { getToken } = useAuth();
    const router = useRouter();
    const { t, language } = useLanguage();
    const { formatPrice } = useCurrency();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        recentOrders: []
    });

    const [chartsLoading, setChartsLoading] = useState(true);
    const [charts, setCharts] = useState<ChartsData | null>(null);

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

    const fetchCharts = async () => {
        try {
            const token = await getToken();
            const { data } = await api.get("/admin/charts", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) {
                setCharts(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch admin charts : ", error);
        } finally {
            setChartsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchCharts();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        setChartsLoading(true);
        fetchStats();
        fetchCharts();
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-surface">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const weekdayLabel = (isoDate: string) => {
        const locale = language === "ar" ? "ar-TN" : language;
        const label = new Date(isoDate + "T00:00:00").toLocaleDateString(locale, {
            weekday: "short",
        });
        return label.charAt(0).toUpperCase() + label.slice(1, 3);
    };

    // Config "épurée" : pas de grille, fond blanc, labels discrets —
    // cohérent avec les cartes blanches minimalistes du reste de l'app
    const chartConfigBase = {
        backgroundGradientFrom: "#ffffff",
        backgroundGradientTo: "#ffffff",
        decimalPlaces: 0,
        labelColor: () => COLORS.secondary,
        propsForBackgroundLines: { stroke: "transparent" },
        propsForLabels: { fontSize: 11 },
    };

    const revenueChartConfig = {
        ...chartConfigBase,
        color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`,
        fillShadowGradientFrom: "#16A34A",
        fillShadowGradientFromOpacity: 0.22,
        fillShadowGradientTo: "#ffffff",
        fillShadowGradientToOpacity: 0.01,
        propsForDots: { r: "3.5", strokeWidth: "2", stroke: "#16A34A", fill: "#ffffff" },
    };

    const ordersChartConfig = {
        ...chartConfigBase,
        color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
        barPercentage: 0.5,
        barRadius: 6,
    };

    const weeklyRevenue = charts?.dailyStats.reduce((a, d) => a + d.revenue, 0) ?? 0;
    const weeklyOrders = charts?.dailyStats.reduce((a, d) => a + d.orders, 0) ?? 0;
    const totalStatusCount = charts?.statusBreakdown.reduce((a, s) => a + s.count, 0) ?? 0;
    const maxTopProductQty = charts?.topProducts.length
        ? Math.max(...charts.topProducts.map((p) => p.qty))
        : 0;

    const donutData =
        charts?.statusBreakdown
            .filter((s) => s.count > 0)
            .map((s) => {
                const meta = STATUS_META[s.status] ?? {
                    color: "#9CA3AF",
                    labelKey: "",
                    fallback: s.status,
                };
                return {
                    status: s.status,
                    count: s.count,
                    color: meta.color,
                    label: meta.labelKey ? (t(meta.labelKey) || meta.fallback) : meta.fallback,
                };
            }) ?? [];

    return (
        <ScrollView
            className="flex-1 bg-surface"
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
           
            <View className="mb-6 mt-2 flex-row items-center justify-between">
                <View>
                    <Text className="text-secondary text-xs font-semibold uppercase tracking-widest mb-1">
                        {t("dashboard") || "Tableau de bord"}
                    </Text>
                    <Text className="text-primary font-extrabold text-3xl tracking-tight">
                        {t("overview")}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => router.push("/admin/users")}
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: COLORS.primary,
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 999,
                        shadowColor: COLORS.primary,
                        shadowOpacity: 0.25,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 5 },
                        elevation: 3,
                    }}
                >
                    <Ionicons name="people-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text className="text-white font-bold text-[13px]">{t("viewUsers") || "View Users"}</Text>
                </TouchableOpacity>
            </View>

          
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

            {/* ============================================================ */}
            {/* ✅ SECTION STATISTIQUES                                        */}
            {/* ============================================================ */}
            <View className="mb-8">
                <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-primary font-extrabold text-2xl tracking-tight">
                        {t("statistics") || "Statistiques"}
                    </Text>
                    <View className="bg-gray-100 px-3 py-1 rounded-full">
                        <Text className="text-secondary text-xs font-bold">
                            {t("last7Days") || "7 derniers jours"}
                        </Text>
                    </View>
                </View>

                {chartsLoading ? (
                    <View className="bg-white p-10 rounded-3xl border border-gray-100 items-center justify-center" style={CARD_SHADOW}>
                        <ActivityIndicator color={COLORS.primary} />
                    </View>
                ) : !charts ? (
                    <View className="bg-white p-8 rounded-3xl border border-gray-100 items-center" style={CARD_SHADOW}>
                        <Text className="text-secondary font-medium">
                            {t("noData") || "Aucune donnée disponible"}
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Courbe des revenus — carte "hero" avec total en tête */}
                        <ChartCard icon="trending-up-outline" accent="#16A34A" accentBg="#DCFCE7">
                            <View className="flex-row items-center justify-between mb-1">
                                <View>
                                    <Text className="text-secondary text-[11px] font-semibold uppercase tracking-wide mb-1">
                                        {t("revenueTrend") || "Revenus de la semaine"}
                                    </Text>
                                    <Text className="text-primary font-extrabold text-2xl tracking-tight">
                                        {formatPrice(weeklyRevenue)}
                                    </Text>
                                </View>
                            </View>
                            <LineChart
                                data={{
                                    labels: charts.dailyStats.map((d) => weekdayLabel(d.date)),
                                    datasets: [{ data: charts.dailyStats.map((d) => d.revenue) }],
                                }}
                                width={CHART_WIDTH}
                                height={170}
                                bezier
                                withInnerLines={false}
                                withOuterLines={false}
                                withShadow={false}
                                chartConfig={revenueChartConfig}
                                style={{ marginLeft: -20, marginTop: 8 }}
                            />
                        </ChartCard>

                        {/* Commandes par jour */}
                        <ChartCard icon="bar-chart-outline" accent="#2563EB" accentBg="#DBEAFE">
                            <View className="flex-row items-center justify-between mb-1">
                                <View>
                                    <Text className="text-secondary text-[11px] font-semibold uppercase tracking-wide mb-1">
                                        {t("ordersPerDay") || "Commandes de la semaine"}
                                    </Text>
                                    <Text className="text-primary font-extrabold text-2xl tracking-tight">
                                        {weeklyOrders}
                                    </Text>
                                </View>
                            </View>
                            <BarChart
                                data={{
                                    labels: charts.dailyStats.map((d) => weekdayLabel(d.date)),
                                    datasets: [{ data: charts.dailyStats.map((d) => d.orders) }],
                                }}
                                width={CHART_WIDTH}
                                height={170}
                                fromZero
                                showValuesOnTopOfBars
                                withInnerLines={false}
                                chartConfig={ordersChartConfig}
                                style={{ marginLeft: -20, marginTop: 8 }}
                                yAxisLabel=""
                                yAxisSuffix=""
                            />
                        </ChartCard>

                        {/* Répartition des commandes — donut custom + légende en pills */}
                        {totalStatusCount > 0 && (
                            <ChartCard icon="pie-chart-outline" accent="#7C3AED" accentBg="#EDE9FE">
                                <Text className="text-secondary text-[11px] font-semibold uppercase tracking-wide mb-3">
                                    {t("ordersByStatus") || "Répartition des commandes"}
                                </Text>
                                <View className="flex-row items-center">
                                    <Donut data={donutData.map((d) => ({ value: d.count, color: d.color }))} total={totalStatusCount} />
                                    <View className="flex-1 ml-5">
                                        {donutData.map((s, idx) => (
                                            <View
                                                key={`${s.status}-${idx}`}
                                                className="flex-row items-center justify-between mb-2.5"
                                            >
                                                <View className="flex-row items-center flex-1">
                                                    <View
                                                        style={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: 4,
                                                            backgroundColor: s.color,
                                                            marginRight: 8,
                                                        }}
                                                    />
                                                    <Text
                                                        className="text-primary text-[13px] font-semibold flex-1"
                                                        numberOfLines={1}
                                                    >
                                                        {s.label}
                                                    </Text>
                                                </View>
                                                <Text className="text-secondary text-[13px] font-bold ml-2">
                                                    {s.count}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </ChartCard>
                        )}

                        {/* Top produits vendus — barres horizontales + badge de rang */}
                        {charts.topProducts.length > 0 && (
                            <ChartCard icon="trophy-outline" accent="#D97706" accentBg="#FEF3C7">
                                <Text className="text-secondary text-[11px] font-semibold uppercase tracking-wide mb-4">
                                    {t("topProducts") || "Produits les plus vendus"}
                                </Text>
                                {charts.topProducts.map((p, idx) => {
                                    const ratio = maxTopProductQty > 0 ? p.qty / maxTopProductQty : 0;
                                    const isTop = idx === 0;
                                    return (
                                        <View key={`${p.name}-${idx}`} className="flex-row items-center mb-4">
                                            <View
                                                className="w-7 h-7 rounded-full items-center justify-center mr-3"
                                                style={{ backgroundColor: isTop ? COLORS.primary : "#F3F4F6" }}
                                            >
                                                <Text
                                                    className="font-extrabold text-[11px]"
                                                    style={{ color: isTop ? "#fff" : COLORS.secondary }}
                                                >
                                                    {idx + 1}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <View className="flex-row justify-between mb-1.5">
                                                    <Text
                                                        className="text-primary text-sm font-semibold flex-1"
                                                        numberOfLines={1}
                                                        style={{ marginRight: 8 }}
                                                    >
                                                        {p.name}
                                                    </Text>
                                                    <Text className="text-secondary text-xs font-bold">
                                                        {p.qty} {t("sold") || "vendus"}
                                                    </Text>
                                                </View>
                                                <View
                                                    style={{
                                                        height: 7,
                                                        borderRadius: 999,
                                                        backgroundColor: "#F3F4F6",
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    <View
                                                        style={{
                                                            height: "100%",
                                                            width: `${Math.max(ratio * 100, 6)}%`,
                                                            borderRadius: 999,
                                                            backgroundColor: isTop ? "#D97706" : "#F3C97A",
                                                        }}
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </ChartCard>
                        )}
                    </>
                )}
            </View>

           
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

// ================================================================
// Donut custom (SVG) — anneau segmenté + total centré, façon Power BI
// ================================================================
const Donut = ({
    data,
    total,
    size = 120,
    strokeWidth = 16,
}: {
    data: { value: number; color: string }[];
    total: number;
    size?: number;
    strokeWidth?: number;
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const safeTotal = total || 1;
    let cumulative = 0;

    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size}>
                <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="#F3F4F6"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    {data.map((d, i) => {
                        const dash = (d.value / safeTotal) * circumference;
                        const dashOffset = -cumulative;
                        cumulative += dash;
                        return (
                            <Circle
                                key={i}
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                stroke={d.color}
                                strokeWidth={strokeWidth}
                                strokeDasharray={`${dash} ${circumference - dash}`}
                                strokeDashoffset={dashOffset}
                                strokeLinecap="butt"
                                fill="transparent"
                            />
                        );
                    })}
                </G>
            </Svg>
            <View
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: "center",
                    justifyContent: "center",
                }}
                pointerEvents="none"
            >
                <Text className="text-primary font-extrabold text-xl">{total}</Text>
            </View>
        </View>
    );
};

const ChartCard = ({
    icon,
    accent,
    accentBg,
    children,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
    accentBg: string;
    children: React.ReactNode;
}) => (
    <View className="bg-white rounded-3xl border border-gray-100 mb-4 overflow-hidden" style={CARD_SHADOW}>
        <View className="p-5">
            <View
                className="w-9 h-9 rounded-2xl items-center justify-center mb-3"
                style={{ backgroundColor: accentBg }}
            >
                <Ionicons name={icon} size={16} color={accent} />
            </View>
            {children}
        </View>
    </View>
);

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