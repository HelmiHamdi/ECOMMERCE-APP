import React, { useState } from "react";
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import Header from "@/components/Header";
import api from "@/constants/api";
import { useAuth } from "@clerk/clerk-expo";
import { useLanguage } from "@/context/LanguageContext";

export default function AddGif() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { t } = useLanguage();

  const [title, setTitle] = useState("");
  const [order, setOrder] = useState("0");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    if (!imageUri) {
      Toast.show({
        type: "error",
        text1: t("missingFields") || "Champs manquants",
        text2: t("gifRequired") || "Veuillez sélectionner un gif",
      });
      return;
    }

    const filename = imageUri.split("/").pop() || "promo.gif";
    if (!/\.gif$/i.test(filename)) {
      Toast.show({
        type: "error",
        text1: t("invalidFile") || "Fichier invalide",
        text2: t("gifOnly") || "Veuillez choisir un fichier .gif",
      });
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      const formData = new FormData();
      formData.append("title", title);
      formData.append("order", order);
      formData.append("image", { uri: imageUri, name: filename, type: "image/gif" } as any);

      const { data } = await api.post("gifs", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data?.success) {
        Toast.show({
          type: "success",
          text1: t("success") || "Succès",
          text2: t("gifCreated") || "Gif ajouté avec succès",
        });
        router.back();
      }
    } catch (error: any) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: t("failedToCreateGif") || "Échec de l'ajout",
        text2: error.response?.data?.message || t("somethingWentWrong") || "Une erreur est survenue",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={t("addGif") || "Ajouter un gif"} showMenu={false} showBack />
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
              <Text className="text-gray-400 mt-2">
                {t("chooseGif") || "Choisir un gif (.gif)"}
              </Text>
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

        <Text className="text-xs text-gray-400 mb-6">
          {t("gifActivateHint") ||
            "Après l'ajout, active le gif depuis la liste pour qu'il s'affiche sur l'accueil."}
        </Text>

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
    </SafeAreaView>
  );
}