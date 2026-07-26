import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import Header from "@/components/Header";
import api from "@/constants/api";
import { Devis } from "@/constants/types";
import { useLanguage } from "@/context/LanguageContext";
import { COLORS } from "@/constants";
import {
  DEVIS_COLORS,
  DEVIS_STATUS_KEYS,
  DEVIS_STATUS_META,
} from "@/constants/devisTheme";

export default function MyDevisScreen() {
  const { t } = useLanguage();
  const { getToken } = useAuth();
  const [list, setList] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await api.get("/devis/mine", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setList(res.data.data);
    } catch (error) {
      console.error(error);
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Header title={t("myDevisTitle") ?? "Mes demandes"} showBack />

      <FlatList
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        data={list}
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
          <Text className="font-bold text-[15px] mb-3" style={{ color: DEVIS_COLORS.ink }}>
            {list.length} {t("devisCount") ?? "demande(s) de devis"}
          </Text>
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons name="document-text-outline" size={44} color={DEVIS_COLORS.muted} />
            <Text className="text-center mt-4" style={{ color: DEVIS_COLORS.muted }}>
              {t("devisNoRequests") ?? "Vous n'avez aucune demande de devis"}
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
            <View
              className="rounded-2xl mb-3 overflow-hidden"
              style={{ backgroundColor: DEVIS_COLORS.surface }}
            >
              <View className="flex-row">
                <View style={{ width: 4, backgroundColor: meta.color }} />
                <View className="flex-1 p-4">
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center flex-1 mr-2">
                      <Ionicons name="pricetag-outline" size={14} color={DEVIS_COLORS.subink} />
                      <Text
                        className="font-bold ml-1.5 flex-1"
                        style={{ color: DEVIS_COLORS.ink }}
                        numberOfLines={1}
                      >
                        {productName}
                      </Text>
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
                    className="text-[13px] mt-1"
                    style={{ color: DEVIS_COLORS.muted }}
                    numberOfLines={2}
                  >
                    {item.message}
                  </Text>

                  {item.adminResponse ? (
                    <View
                      className="mt-3 pt-3 rounded-xl px-3 py-3"
                      style={{ backgroundColor: `${COLORS.primary}0F` }}
                    >
                      <View className="flex-row items-center mb-1">
                        <Ionicons name="chatbubble-ellipses-outline" size={13} color={COLORS.primary} />
                        <Text
                          className="font-bold text-[11px] ml-1.5"
                          style={{ color: COLORS.primary }}
                        >
                          {t("devisResponse") ?? "Réponse"}
                        </Text>
                      </View>
                      <Text className="text-[13px]" style={{ color: DEVIS_COLORS.ink }}>
                        {item.adminResponse}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}