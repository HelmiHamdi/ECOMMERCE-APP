import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Header from "@/components/Header";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import api from "@/constants/api";
import { Banner } from "@/constants/types";
import { useAuth } from "@clerk/clerk-expo"; 
import { useLanguage } from "@/context/LanguageContext";
import { COLORS } from "@/constants";

export default function AdminBannersIndex() {
  const router = useRouter();
  const { getToken } = useAuth(); 
  const { t } = useLanguage();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await api.get("banners/all", {
        headers: { Authorization: `Bearer ${token}` }, 
      });
      setBanners(data.data);
    } catch (error) {
      console.error("Error fetching banners:", error);
    } finally {
      setLoading(false);
    }
  };


  useFocusEffect(
    useCallback(() => {
      fetchBanners();
    }, []),
  );

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const token = await getToken(); 
      await api.delete(`banners/${deleteTarget._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBanners((prev) => prev.filter((b) => b._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting banner:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={t("banners")} showMenu={false} />
      <View className="flex-1 px-4">
        <TouchableOpacity
          className="bg-primary py-3 rounded-full items-center my-4 flex-row justify-center"
          onPress={() => router.push("/admin/banners/add")}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-white font-bold ml-1">
            {t("addBanner") || "Ajouter une bannière"}
          </Text>
        </TouchableOpacity>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {banners.length === 0 ? (
              <Text className="text-center text-secondary mt-10">
                {t("noBanners") || "Aucune bannière pour le moment"}
              </Text>
            ) : (
              banners.map((banner) => (
                <View
                  key={banner._id}
                  className="flex-row bg-white rounded-2xl mb-3 overflow-hidden border border-gray-100"
                >
                  <Image
                    source={{ uri: banner.image }}
                    className="w-24 h-24"
                    resizeMode="cover"
                  />
                  <View className="flex-1 p-3 justify-between">
                    <View>
                      <Text
                        className="font-bold text-primary text-base"
                        numberOfLines={1}
                      >
                        {banner.title}
                      </Text>
                      {banner.subtitle ? (
                        <Text
                          className="text-secondary text-xs"
                          numberOfLines={1}
                        >
                          {banner.subtitle}
                        </Text>
                      ) : null}
                      <Text className="text-gray-400 text-xs mt-1">
                        {t("order") || "Ordre"}: {banner.order} •{" "}
                        {banner.isActive
                          ? t("active") || "Active"
                          : t("inactive") || "Inactive"}
                      </Text>
                    </View>
                    <View className="flex-row gap-4 mt-2">
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: "/admin/banners/edit/[id]",
                            params: { id: banner._id },
                          })
                        }
                        className="flex-row items-center"
                      >
                        <Ionicons
                          name="create-outline"
                          size={16}
                          color={COLORS.primary}
                        />
                        <Text className="text-primary font-medium text-sm ml-1">
                          {t("Edit") || "Modifier"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setDeleteTarget(banner)}
                        className="flex-row items-center"
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#DC2626"
                        />
                        <Text className="text-red-600 font-medium text-sm ml-1">
                          {t("delete") || "Supprimer"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
            <View className="h-10" />
          </ScrollView>
        )}
      </View>

      <ConfirmDeleteModal
        visible={!!deleteTarget}
        title={t("deleteBannerTitle") || "Supprimer la bannière"}
        message={
          t("deleteBannerMessage") ||
          "Cette action est irréversible. Voulez-vous continuer ?"
        }
        itemName={deleteTarget?.title}
        cancelText={t("cancel") || "Annuler"}
        confirmText={t("delete") || "Supprimer"}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </SafeAreaView>
  );
}