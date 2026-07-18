import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Header from "@/components/Header";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import api from "@/constants/api";
import { Gif } from "@/constants/types";
import { useAuth } from "@clerk/clerk-expo";
import { useLanguage } from "@/context/LanguageContext";
import { COLORS } from "@/constants";
import Toast from "react-native-toast-message";

export default function AdminGifsIndex() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Gif | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchGifs = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await api.get("gifs/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGifs(data.data);
    } catch (error) {
      console.error("Error fetching gifs:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGifs();
    }, []),
  );

  const handleToggleActive = async (gif: Gif, value: boolean) => {
    try {
      setTogglingId(gif._id);
      const token = await getToken();
      const endpoint = value ? "activate" : "deactivate";
      await api.patch(`gifs/${gif._id}/${endpoint}`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGifs((prev) =>
        prev.map((g) =>
          g._id === gif._id ? { ...g, isActive: value } : value ? { ...g, isActive: false } : g
        )
      );
    } catch (error) {
      console.error("Error toggling gif:", error);
      Toast.show({
        type: "error",
        text1: t("error") || "Erreur",
        text2: t("somethingWentWrong") || "Une erreur est survenue",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const token = await getToken();
      await api.delete(`gifs/${deleteTarget._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGifs((prev) => prev.filter((g) => g._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting gif:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={t("gifs") || "Gifs"} showMenu={false} />
      <View className="flex-1 px-4">
        <TouchableOpacity
          className="bg-primary py-3 rounded-full items-center my-4 flex-row justify-center"
          onPress={() => router.push("/admin/gifs/add")}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-white font-bold ml-1">
            {t("addGif") || "Ajouter un gif"}
          </Text>
        </TouchableOpacity>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {gifs.length === 0 ? (
              <Text className="text-center text-secondary mt-10">
                {t("noGifs") || "Aucun gif pour le moment"}
              </Text>
            ) : (
              gifs.map((gif) => (
                <View
                  key={gif._id}
                  className="flex-row bg-white rounded-2xl mb-3 overflow-hidden border border-gray-100"
                >
                  <Image source={{ uri: gif.image }} className="w-24 h-24" resizeMode="cover" />
                  <View className="flex-1 p-3 justify-between">
                    <View>
                      <Text className="font-bold text-primary text-base" numberOfLines={1}>
                        {gif.title || t("untitled") || "Sans titre"}
                      </Text>
                      <Text className="text-gray-400 text-xs mt-1">
                        {gif.isActive
                          ? t("displayedOnHome") || "Affiché sur l'accueil"
                          : t("notDisplayed") || "Non affiché"}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between mt-2">
                      <View className="flex-row gap-4">
                        <TouchableOpacity
                          onPress={() =>
                            router.push({
                              pathname: "/admin/gifs/edit/[id]",
                              params: { id: gif._id },
                            })
                          }
                          className="flex-row items-center"
                        >
                          <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                          <Text className="text-primary font-medium text-sm ml-1">
                            {t("Edit") || "Modifier"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setDeleteTarget(gif)}
                          className="flex-row items-center"
                        >
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                          <Text className="text-red-600 font-medium text-sm ml-1">
                            {t("delete") || "Supprimer"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {togglingId === gif._id ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <Switch
                          value={gif.isActive}
                          onValueChange={(value) => handleToggleActive(gif, value)}
                        />
                      )}
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
        title={t("deleteGifTitle") || "Supprimer le gif"}
        message={t("deleteGifMessage") || "Cette action est irréversible. Voulez-vous continuer ?"}
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