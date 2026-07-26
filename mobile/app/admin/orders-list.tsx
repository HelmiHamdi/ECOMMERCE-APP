import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useAuth } from "@clerk/clerk-expo";
import { COLORS } from "@/constants";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { getCountryFlag } from "../utils/countryFlags";
import {
  getCategoryLabel,
  getStockStatusLabel,
  getStockStatusColor,
} from "../utils/productLabels";
import AdminBottomMenu from "@/components/AdminBottomMenu";

const STATUS_META: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  placed: { icon: "receipt-outline", color: "#F59E0B", bg: "#FEF3C7" },
  processing: { icon: "sync-outline", color: "#3B82F6", bg: "#DBEAFE" },
  shipped: { icon: "car-outline", color: "#8B5CF6", bg: "#EDE9FE" },
  delivered: {
    icon: "checkmark-done-outline",
    color: "#10B981",
    bg: "#D1FAE5",
  },
  cancelled: { icon: "close-circle-outline", color: "#EF4444", bg: "#FEE2E2" },
};

const FILTERS = [
  "all",
  "placed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const AddressField = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;
  return (
    <View className="w-1/2 mb-1.5 pr-2">
      <Text className="text-secondary text-[10px] font-bold uppercase">
        {label}
      </Text>
      <Text className="text-primary text-xs mt-0.5">{value}</Text>
    </View>
  );
};

export default function AdminOrdersList() {
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // 👇 plage de dates
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [pickingField, setPickingField] = useState<"start" | "end">("start");

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getFilterLabel = (status: string) => {
    switch (status) {
      case "all":
        return t("all") ?? "Tous";
      case "placed":
        return t("statusPlaced") ?? "Placée";
      case "processing":
        return t("statusProcessing") ?? "En traitement";
      case "shipped":
        return t("statusShipped") ?? "Expédiée";
      case "delivered":
        return t("statusDelivered") ?? "Livrée";
      case "cancelled":
        return t("statusCancelled") ?? "Annulée";
      default:
        return status;
    }
  };

  const buildParams = () => {
    const params: any = {};
    if (activeFilter !== "all") params.status = activeFilter;
    if (search.trim()) params.search = search.trim();
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return params;
  };

  const fetchOrders = useCallback(
    async (targetPage = 1, append = false) => {
      try {
        if (!append) setLoading((prev) => prev && orders.length === 0);
        else setLoadingMore(true);

        const token = await getToken();
        const params = { ...buildParams(), page: targetPage, limit: 15 };

        const { data } = await api.get("/orders/admin/details", {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });

        if (data.success) {
          setOrders((prev) => (append ? [...prev, ...data.data] : data.data));
          setPage(data.pagination.page);
          setPages(data.pagination.pages);
        }
      } catch (error) {
        console.error("Failed to fetch admin orders list:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeFilter, search, startDate, endDate, getToken],
  );

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchOrders(1, false);
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeFilter, startDate, endDate]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(1, false);
  };

  const loadMore = () => {
    if (loadingMore || page >= pages) return;
    fetchOrders(page + 1, true);
  };

  // 👇 sélection de dates
  const openCalendar = (field: "start" | "end") => {
    setPickingField(field);
    setCalendarVisible(true);
  };

  const handleDayPress = (day: { dateString: string }) => {
    if (pickingField === "start") {
      setStartDate(day.dateString);
      if (endDate && day.dateString > endDate) setEndDate(null);
    } else {
      if (startDate && day.dateString < startDate) {
        Alert.alert(
          t("error") ?? "Erreur",
          t("endDateBeforeStart") ??
            "La date de fin doit être après la date de début.",
        );
        return;
      }
      setEndDate(day.dateString);
    }
    setCalendarVisible(false);
  };

  const clearDateRange = () => {
    setStartDate(null);
    setEndDate(null);
  };

  // 👇 export PDF
  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const token = await getToken();
      const params = buildParams();
      const query = new URLSearchParams(params).toString();
      const url = `${api.defaults.baseURL}/orders/admin/export${query ? `?${query}` : ""}`;
      const fileUri = FileSystem.cacheDirectory + `commandes-${Date.now()}.pdf`;

      const { uri } = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: t("exportOrders") ?? "Exporter les commandes",
        });
      } else {
        Alert.alert(
          t("success") ?? "Succès",
          t("pdfSavedLocally") ?? "PDF enregistré.",
        );
      }
    } catch (error) {
      console.error("Failed to export orders PDF:", error);
      Alert.alert(
        t("error") ?? "Erreur",
        t("failedToExportOrders") ?? "Échec de l'export du PDF.",
      );
    } finally {
      setExporting(false);
    }
  };

  // 👇 tableau horizontal compact : image | nom | quantité | prix | catégorie | type de stock
  const ItemsTable = ({
    items,
    t,
    formatPrice,
  }: {
    items: any[];
    t: (k: string) => string | undefined;
    formatPrice: (p: number) => string;
  }) => {
    if (!items || items.length === 0) return null;

    return (
      <View className="mt-2 mb-1 border border-gray-100 rounded-xl overflow-hidden">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {/* En-tête */}
            <View className="flex-row bg-gray-50 border-b border-gray-100">
              <Text className="w-[46px] text-[9px] font-bold text-secondary uppercase px-1.5 py-2">
                {t("image") ?? "Image"}
              </Text>
              <Text className="w-[100px] text-[9px] font-bold text-secondary uppercase px-1.5 py-2">
                {t("product") ?? "Produit"}
              </Text>
              <Text className="w-[55px] text-[9px] font-bold text-secondary uppercase px-1.5 py-2 text-center">
                {t("quantity") ?? "Qté"}
              </Text>
              <Text className="w-[65px] text-[9px] font-bold text-secondary uppercase px-1.5 py-2">
                {t("price") ?? "Prix"}
              </Text>
              <Text className="w-[85px] text-[9px] font-bold text-secondary uppercase px-1.5 py-2">
                {t("category") ?? "Catégorie"}
              </Text>
              <Text className="w-[100px] text-[9px] font-bold text-secondary uppercase px-1.5 py-2">
                {t("stockType") ?? "Stock"}
              </Text>
            </View>

            {/* Lignes */}
            {items.map((it: any, idx: number) => {
              const stockLabel = getStockStatusLabel(it.stockStatus, t);
              const stockColors = getStockStatusColor(it.stockStatus);
              const categoryLabel = getCategoryLabel(it.category, t);

              return (
                <View
                  key={idx}
                  className={`flex-row items-center ${
                    idx !== items.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  <View className="w-[46px] items-center py-1.5 px-1.5">
                    {it.image ? (
                      <Image
                        source={{ uri: it.image }}
                        className="w-8 h-8 rounded-md"
                      />
                    ) : (
                      <View className="w-8 h-8 rounded-md bg-gray-100 items-center justify-center">
                        <Ionicons
                          name="image-outline"
                          size={14}
                          color={COLORS.secondary}
                        />
                      </View>
                    )}
                  </View>

                  <Text
                    className="w-[100px] text-[11px] text-primary px-1.5"
                    numberOfLines={2}
                  >
                    {it.name}
                    {it.size ? ` (${it.size})` : ""}
                  </Text>

                  <Text className="w-[55px] text-[11px] text-primary px-1.5 text-center">
                    {it.quantity}
                  </Text>

                  <Text className="w-[65px] text-[11px] font-bold text-primary px-1.5">
                    {formatPrice(it.price)}
                  </Text>

                  <Text
                    className="w-[85px] text-[11px] text-primary px-1.5"
                    numberOfLines={2}
                  >
                    {categoryLabel ?? "-"}
                  </Text>

                  <View className="w-[100px] px-1.5">
                    {stockLabel ? (
                      <View
                        className="self-start px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: stockColors.bg }}
                      >
                        <Text
                          className="text-[9px] font-bold"
                          style={{ color: stockColors.color }}
                          numberOfLines={1}
                        >
                          {stockLabel}
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-[11px] text-secondary">-</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };
  const renderItem = ({ item }: { item: any }) => {
    const meta = STATUS_META[item.orderStatus] || STATUS_META.placed;
    return (
      <View className="bg-white rounded-2xl mb-4 border border-gray-100 shadow-sm overflow-hidden">
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-50">
          <View className="flex-row items-center flex-1">
            <View
              className="w-9 h-9 rounded-full items-center justify-center mr-2"
              style={{ backgroundColor: meta.bg }}
            >
              <Ionicons name={meta.icon} size={18} color={meta.color} />
            </View>
            <View>
              <Text className="font-bold text-primary text-sm">
                {item.orderNumber || `#${item._id?.slice(-8)}`}
              </Text>
              <Text className="text-secondary text-xs">
                {new Date(item.createdAt).toLocaleDateString()} ·{" "}
                {new Date(item.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>
          <View
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: meta.bg }}
          >
            <Text
              className="text-xs font-bold uppercase"
              style={{ color: meta.color }}
            >
              {getFilterLabel(item.orderStatus)}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center px-4 py-3 bg-gray-50">
          {item.customer?.image ? (
            <Image
              source={{ uri: item.customer.image }}
              className="w-10 h-10 rounded-full mr-3"
            />
          ) : (
            <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center mr-3">
              <Ionicons name="person" size={18} color={COLORS.secondary} />
            </View>
          )}
          <View className="flex-1">
            <Text className="text-primary font-semibold text-sm">
              {item.customer?.name || t("unknownUser") || "Client inconnu"}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <Ionicons
                name="call-outline"
                size={12}
                color={COLORS.secondary}
              />
              <Text className="text-secondary text-xs ml-1">
                {item.customer?.phone || t("noPhone") || "N/A"}
              </Text>
            </View>
            {item.customer?.email && (
              <View className="flex-row items-center mt-0.5">
                <Ionicons
                  name="mail-outline"
                  size={12}
                  color={COLORS.secondary}
                />
                <Text className="text-secondary text-xs ml-1" numberOfLines={1}>
                  {item.customer.email}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="px-4 py-3">
          <View className="mb-3 bg-gray-50 rounded-xl p-3">
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="location-outline"
                size={14}
                color={COLORS.secondary}
              />
              <Text className="text-secondary text-[10px] font-bold uppercase ml-1">
                {t("shippingAddress") ?? "Adresse de livraison"}
              </Text>
            </View>

            <View className="flex-row flex-wrap">
              <AddressField
                label={t("street") ?? "Rue"}
                value={item.shippingAddress?.street}
              />
              <AddressField
                label={t("city") ?? "Ville"}
                value={item.shippingAddress?.city}
              />
              <AddressField
                label={t("state") ?? "État / Région"}
                value={item.shippingAddress?.state}
              />
              <AddressField
                label={t("zipCode") ?? "Code postal"}
                value={item.shippingAddress?.zipCode}
              />
            </View>

            <View className="flex-row items-center mt-1">
              <Text className="text-secondary text-[10px] font-bold uppercase mr-2">
                {t("country") ?? "Pays"}
              </Text>
              <Text style={{ fontSize: 16, marginRight: 4 }}>
                {getCountryFlag(item.shippingAddress?.country)}
              </Text>
              <Text className="text-primary text-xs flex-1">
                {item.shippingAddress?.country}
              </Text>
            </View>
          </View>

          <ItemsTable items={item.items} t={t} formatPrice={formatPrice} />
        </View>

        <View className="flex-row justify-between items-center px-4 py-3 border-t border-gray-100">
          <Text className="text-secondary text-xs">
            {t("total") ?? "Total"}
          </Text>
          <Text className="text-primary font-bold text-lg">
            {formatPrice(item.totalAmount)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-surface">
      <View className="px-4 pt-3 pb-2 bg-white border-b border-gray-100">
        {/* Recherche + export */}
        <View className="flex-row items-center">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-3 h-11">
            <Ionicons
              name="search-outline"
              size={18}
              color={COLORS.secondary}
            />
            <TextInput
              className="flex-1 ml-2 text-sm text-primary"
              placeholder={
                t("searchOrderPlaceholder") ??
                "Rechercher par n° facture, nom, téléphone..."
              }
              placeholderTextColor={COLORS.secondary}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={COLORS.secondary}
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={handleExportPDF}
            disabled={exporting}
            className="ml-2 w-11 h-11 rounded-xl bg-primary items-center justify-center"
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="download-outline" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Filtres par statut */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ paddingRight: 12 }}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                className={`px-4 py-2 rounded-full mr-2 border ${
                  active
                    ? "bg-primary border-primary"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${active ? "text-white" : "text-secondary"}`}
                >
                  {getFilterLabel(f)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Plage de dates */}
        <View className="flex-row items-center mt-3">
          <TouchableOpacity
            onPress={() => openCalendar("start")}
            className="flex-row items-center bg-white border border-gray-200 rounded-lg px-3 py-2 mr-2 flex-1"
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={COLORS.secondary}
            />
            <Text className="text-xs text-secondary ml-2" numberOfLines={1}>
              {startDate
                ? new Date(startDate).toLocaleDateString()
                : (t("startDate") ?? "Date début")}
            </Text>
          </TouchableOpacity>

          <Text className="text-secondary text-xs mx-1">→</Text>

          <TouchableOpacity
            onPress={() => openCalendar("end")}
            className="flex-row items-center bg-white border border-gray-200 rounded-lg px-3 py-2 ml-2 flex-1"
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={COLORS.secondary}
            />
            <Text className="text-xs text-secondary ml-2" numberOfLines={1}>
              {endDate
                ? new Date(endDate).toLocaleDateString()
                : (t("endDate") ?? "Date fin")}
            </Text>
          </TouchableOpacity>

          {(startDate || endDate) && (
            <TouchableOpacity onPress={clearDateRange} className="ml-2 p-2">
              <Ionicons
                name="close-circle"
                size={18}
                color={COLORS.secondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Ionicons
                name="file-tray-outline"
                size={40}
                color={COLORS.secondary}
              />
              <Text className="text-secondary mt-2">
                {t("noOrdersFound") ?? "Aucune commande trouvée"}
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
                className="my-4"
              />
            ) : null
          }
        />
      )}

      {/* Modal calendrier */}
      <Modal
        visible={calendarVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCalendarVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
          activeOpacity={1}
          onPress={() => setCalendarVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                backgroundColor: "#fff",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 12,
                paddingBottom: insets.bottom + 12,
                paddingHorizontal: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "#E5E7EB",
                  alignSelf: "center",
                  marginBottom: 12,
                }}
              />
              <Text className="text-primary font-bold text-sm text-center mb-2">
                {pickingField === "start"
                  ? (t("selectStartDate") ?? "Sélectionner la date de début")
                  : (t("selectEndDate") ?? "Sélectionner la date de fin")}
              </Text>
              <Calendar
                onDayPress={handleDayPress}
                maxDate={new Date().toISOString().split("T")[0]}
                markedDates={{
                  ...(startDate
                    ? {
                        [startDate]: {
                          selected: true,
                          selectedColor: COLORS.primary,
                        },
                      }
                    : {}),
                  ...(endDate
                    ? {
                        [endDate]: {
                          selected: true,
                          selectedColor: COLORS.primary,
                        },
                      }
                    : {}),
                }}
                theme={{
                  todayTextColor: COLORS.primary,
                  selectedDayBackgroundColor: COLORS.primary,
                  arrowColor: COLORS.primary,
                }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

     
      <AdminBottomMenu />
    </View>
  );
}