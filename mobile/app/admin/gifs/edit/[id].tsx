import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import Header from "@/components/Header";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import api from "@/constants/api";
import { Gif } from "@/constants/types";
import { useAuth } from "@clerk/clerk-expo";
import { useLanguage } from "@/context/LanguageContext";
import { COLORS } from "@/constants";

export default function EditGif() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gif, setGif] = useState<Gif | null>(null);

  const [title, setTitle] = useState("");
  const [order, setOrder] = useState("0");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchGif = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        const { data } = await api.get(`gifs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const g: Gif = data.data;
        setGif(g);
        setTitle(g.title || "");
        setOrder(String(g.order));
        setImageUri(g.image);
      } catch (error: any) {
        console.error(error);
        Toast.show({
          type: "error",
          text1: t("failedToFetchGif") || "Échec du chargement",
          text2: error.response?.data?.message || t("somethingWentWrong") || "Une erreur est survenue",
        });
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchGif();
  }, [id]);

  const pickGif = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      const formData = new FormData();
      formData.append("title", title);
      formData.append("order", order);

      const isNewImage = imageUri && imageUri !== gif?.image;
      if (isNewImage) {
        const filename = imageUri!.split("/").pop() || "promo.gif";
        formData.append("image", { uri: imageUri, name: filename, type: "image/gif" } as any);
      }

      const { data } = await api.put(`gifs/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data?.success) {
        Toast.show({
          type: "success",
          text1: t("success") || "Succès",
          text2: t("gifUpdated") || "Gif modifié avec succès",
        });
        router.back();
      }
    } catch (error: any) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: t("failedToUpdateGif") || "Échec de la modification",
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
      await api.delete(`gifs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Toast.show({
        type: "success",
        text1: t("success") || "Succès",
        text2: t("gifDeleted") || "Gif supprimé avec succès",
      });
      setDeleteVisible(false);
      router.back();
    } catch (error: any) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: t("failedToDeleteGif") || "Échec de la suppression",
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
        title={t("editGif") || "Modifier le gif"}
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
          onPress={pickGif}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="items-center">
              <Ionicons name="film-outline" size={32} color="#9CA3AF" />
              <Text className="text-gray-400 mt-2">{t("chooseGif") || "Choisir un gif"}</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text className="text-sm font-medium mb-1">{t("title") || "Titre"}</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          className="border border-gray-200 bg-white rounded-xl px-3 py-3 mb-3"
          placeholder={t("gifTitlePlaceholder") || "Titre du gif (optionnel)"}
        />

        <Text className="text-sm font-medium mb-1">{t("order") || "Ordre d'affichage"}</Text>
        <TextInput
          value={order}
          onChangeText={setOrder}
          keyboardType="numeric"
          className="border border-gray-200 bg-white rounded-xl px-3 py-3 mb-3"
          placeholder="0"
        />

        {gif?.isActive && (
          <View className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-6">
            <Text className="text-green-700 text-xs font-medium">
              {t("gifCurrentlyActive") || "Ce gif est actuellement affiché sur l'accueil"}
            </Text>
          </View>
        )}

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
        title={t("deleteGifTitle") || "Supprimer le gif"}
        message={t("deleteGifMessage") || "Cette action est irréversible. Voulez-vous continuer ?"}
        itemName={gif?.title}
        cancelText={t("cancel") || "Annuler"}
        confirmText={t("delete") || "Supprimer"}
        onCancel={() => setDeleteVisible(false)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </SafeAreaView>
  );
}