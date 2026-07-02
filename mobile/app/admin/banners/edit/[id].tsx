import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message"; // ✅ AJOUT
import Header from "@/components/Header";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import api from "@/constants/api";
import { Banner } from "@/constants/types";
import { useAuth } from "@clerk/clerk-expo";
import { useLanguage } from "@/context/LanguageContext";
import { COLORS } from "@/constants";

export default function EditBanner() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [link, setLink] = useState("/shop");
  const [order, setOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        const { data } = await api.get(`banners/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const b: Banner = data.data;
        setBanner(b);
        setTitle(b.title);
        setSubtitle(b.subtitle || "");
        setLink(b.link || "/shop");
        setOrder(String(b.order));
        setIsActive(b.isActive);
        setImageUri(b.image);
      } catch (error: any) {
        console.error(error);
        Toast.show({
          type: "error",
          text1: t("failedToFetchBanner") || "Échec du chargement",
          text2: error.response?.data?.message || t("somethingWentWrong") || "Une erreur est survenue",
        });
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchBanner();
  }, [id]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Toast.show({
        type: "error",
        text1: t("missingFields") || "Champs manquants",
        text2: t("titleRequired") || "Le titre est obligatoire",
      });
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      const formData = new FormData();
      formData.append("title", title);
      formData.append("subtitle", subtitle);
      formData.append("link", link);
      formData.append("order", order);
      formData.append("isActive", String(isActive));

      const isNewImage = imageUri && imageUri !== banner?.image;
      if (isNewImage) {
        const filename = imageUri!.split("/").pop() || "banner.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image";
        formData.append("image", { uri: imageUri, name: filename, type } as any);
      }

      const { data } = await api.put(`banners/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data?.success) {
        Toast.show({
          type: "success",
          text1: t("success") || "Succès",
          text2: t("bannerUpdated") || "Bannière modifiée avec succès",
        });
        router.back();
      }
    } catch (error: any) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: t("failedToUpdateBanner") || "Échec de la modification",
        text2: error.response?.data?.message || t("somethingWentWrong") || "Une erreur est survenue",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      const token = await getToken();
      await api.delete(`banners/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Toast.show({
        type: "success",
        text1: t("success") || "Succès",
        text2: t("bannerDeleted") || "Bannière supprimée avec succès",
      });
      setDeleteVisible(false);
      router.back();
    } catch (error: any) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: t("failedToDeleteBanner") || "Échec de la suppression",
        text2: error.response?.data?.message || t("somethingWentWrong") || "Une erreur est survenue",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header
        title={t("editBanner") || "Modifier la bannière"}
        showMenu={false}
        showBack
        rightAction={
          <TouchableOpacity onPress={() => setDeleteVisible(true)} className="mr-1">
            <Ionicons name="trash-outline" size={22} color="#DC2626" />
          </TouchableOpacity>
        }
      />
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          className="w-full h-40 bg-white rounded-2xl mt-4 mb-4 items-center justify-center overflow-hidden border border-gray-100"
          onPress={pickImage}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="items-center">
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
              <Text className="text-gray-400 mt-2">
                {t("chooseImage") || "Choisir une image"}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Text className="text-sm font-medium mb-1">{t("title") || "Titre"} *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          className="border border-gray-200 bg-white rounded-xl px-3 py-3 mb-3"
          placeholder={t("bannerTitlePlaceholder") || "Titre de la bannière"}
        />

        <Text className="text-sm font-medium mb-1">{t("subtitle") || "Sous-titre"}</Text>
        <TextInput
          value={subtitle}
          onChangeText={setSubtitle}
          className="border border-gray-200 bg-white rounded-xl px-3 py-3 mb-3"
          placeholder={t("subtitle") || "Sous-titre"}
        />

        <Text className="text-sm font-medium mb-1">{t("link") || "Lien (ex: /shop)"}</Text>
        <TextInput
          value={link}
          onChangeText={setLink}
          className="border border-gray-200 bg-white rounded-xl px-3 py-3 mb-3"
          placeholder="/shop"
        />

        <Text className="text-sm font-medium mb-1">{t("order") || "Ordre d'affichage"}</Text>
        <TextInput
          value={order}
          onChangeText={setOrder}
          keyboardType="numeric"
          className="border border-gray-200 bg-white rounded-xl px-3 py-3 mb-3"
          placeholder="0"
        />

        <View className="flex-row items-center justify-between mb-6 bg-white rounded-xl px-3 py-3 border border-gray-100">
          <Text className="text-sm font-medium">{t("active") || "Active"}</Text>
          <Switch value={isActive} onValueChange={setIsActive} />
        </View>

        <TouchableOpacity
          className="py-3 rounded-full items-center bg-primary mb-10"
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold">{t("save") || "Enregistrer"}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <ConfirmDeleteModal
        visible={deleteVisible}
        title={t("deleteBannerTitle") || "Supprimer la bannière"}
        message={
          t("deleteBannerMessage") ||
          "Cette action est irréversible. Voulez-vous continuer ?"
        }
        itemName={banner?.title}
        cancelText={t("cancel") || "Annuler"}
        confirmText={t("delete") || "Supprimer"}
        onCancel={() => setDeleteVisible(false)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </SafeAreaView>
  );
}