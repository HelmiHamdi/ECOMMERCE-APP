import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import Header from "@/components/Header";
import { Devis } from "@/constants/types";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";
import { COLORS } from "@/constants";
import {
  DEVIS_COLORS,
  DEVIS_STATUS_KEYS,
  DEVIS_STATUS_META,
  formatDevisDate,
  initials,
} from "@/constants/devisTheme";
import AdminBottomMenu from "@/components/AdminBottomMenu";

export default function AdminDevisScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { getToken } = useAuth();
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devisEnabled, setDevisEnabled] = useState(false);
  const [togglingSettings, setTogglingSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      const [devisRes, settingsRes] = await Promise.all([
        api.get("/devis", {
          params: { limit: 50 },
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get("/settings", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setDevisList(devisRes.data.data);
      setUnreadCount(devisRes.data.unreadCount || 0);
      setDevisEnabled(!!settingsRes.data.data.devisEnabled);
    } catch (error) {
      console.error("Erreur chargement devis admin:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleDevis = async (value: boolean) => {
    setTogglingSettings(true);
    setDevisEnabled(value);
    try {
      const token = await getToken();
      await api.put(
        "/settings",
        { devisEnabled: value },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (error) {
      console.error("Erreur mise à jour settings:", error);
      setDevisEnabled(!value);
    } finally {
      setTogglingSettings(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Header title={t("devisRequest") ?? "Demandes de devis"} showBack />

      <FlatList
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        data={devisList}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <>
            {/* ------- Compteur + badge non-lus (remplace l'ancien bandeau plein écran) ------- */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="font-bold text-[15px]" style={{ color: DEVIS_COLORS.ink }}>
                {devisList.length} {t("devisTotal") ?? "demande(s) au total"}
              </Text>
              {unreadCount > 0 && (
                <View
                  className="rounded-full px-2.5 py-1"
                  style={{ backgroundColor: "#EF4444" }}
                >
                  <Text className="text-white font-bold text-[11px]">{unreadCount}</Text>
                </View>
              )}
            </View>

            {/* ------- Carte réglage : activer/désactiver le module côté client ------- */}
            <View
              className="flex-row items-center rounded-2xl p-4 mb-4"
              style={{ backgroundColor: DEVIS_COLORS.surface }}
            >
              <View
                className="w-11 h-11 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${COLORS.primary}1A` }}
              >
                <Ionicons name="pricetags-outline" size={20} color={COLORS.primary} />
              </View>
              <View className="flex-1 mr-2">
                <Text className="font-bold text-[13px]" style={{ color: DEVIS_COLORS.ink }}>
                  {t("devisRequest") ?? "Demande de devis"}
                </Text>
                <Text className="text-[11px] mt-0.5" style={{ color: DEVIS_COLORS.muted }}>
                  {devisEnabled
                    ? (t("devisEnabled") ?? "Visible pour les utilisateurs")
                    : (t("devisDisabled") ?? "Masqué pour les utilisateurs")}
                </Text>
              </View>
              <Switch
                value={devisEnabled}
                onValueChange={handleToggleDevis}
                disabled={togglingSettings}
                trackColor={{ false: "#EDEDF0", true: COLORS.primary }}
              />
            </View>
          </>
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons name="file-tray-outline" size={44} color={DEVIS_COLORS.muted} />
            <Text className="text-center mt-4" style={{ color: DEVIS_COLORS.muted }}>
              {t("devisNoRequestsAdmin") ?? "Aucune demande de devis pour le moment"}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const productName =
            typeof item.product === "object" && item.product
              ? item.product.name
              : (t("devisGeneralRequest") ?? "Demande générale");
          const meta = DEVIS_STATUS_META[item.status];
          const label = t(DEVIS_STATUS_KEYS[item.status]) ?? meta.fallbackLabel;

          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: "/admin/devis/[id]",
                  params: { id: item._id },
                })
              }
              className="rounded-2xl mb-3 overflow-hidden"
              style={{ backgroundColor: DEVIS_COLORS.surface }}
            >
              <View className="flex-row">
                {/* Barre d'accent colorée = lecture instantanée du statut */}
                <View style={{ width: 4, backgroundColor: meta.color }} />
                <View className="flex-1 p-4">
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center flex-1 mr-2">
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center mr-2"
                        style={{ backgroundColor: COLORS.primary }}
                      >
                        <Text className="text-white font-bold text-[12px]">
                          {initials(item.name)}
                        </Text>
                      </View>
                      <Text
                        className="font-bold flex-1"
                        style={{ color: DEVIS_COLORS.ink }}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {!item.isReadByAdmin && (
                        <View
                          className="w-2 h-2 rounded-full ml-2"
                          style={{ backgroundColor: "#EF4444" }}
                        />
                      )}
                    </View>
                    <View
                      className="flex-row items-center rounded-full px-2 py-1"
                      style={{ backgroundColor: meta.soft }}
                    >
                      <Ionicons name={meta.icon} size={11} color={meta.color} />
                      <Text
                        className="font-bold ml-1"
                        style={{ color: meta.color, fontSize: 10 }}
                      >
                        {label}
                      </Text>
                    </View>
                  </View>

                  <Text
                    className="text-[12px] mb-1 font-semibold"
                    style={{ color: DEVIS_COLORS.subink }}
                    numberOfLines={1}
                  >
                    {productName}
                  </Text>

                  <Text
                    className="text-[13px]"
                    style={{ color: DEVIS_COLORS.muted }}
                    numberOfLines={2}
                  >
                    {item.message}
                  </Text>

                  <Text className="text-[11px] mt-2" style={{ color: DEVIS_COLORS.muted }}>
                    {formatDevisDate(item.createdAt)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <AdminBottomMenu />
    </SafeAreaView>
  );
}