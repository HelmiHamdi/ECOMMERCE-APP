import React, { useState } from "react";
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message"; 
import Header from "@/components/Header";
import api from "@/constants/api";
import { useAuth } from "@clerk/clerk-expo";
import { useLanguage } from "@/context/LanguageContext";


export default function AddBanner() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { t } = useLanguage();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [link, setLink] = useState("/shop");
  const [order, setOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    if (!imageUri) {
      Toast.show({
        type: "error",
        text1: t("missingFields") || "Champs manquants",
        text2: t("imageRequired") || "Veuillez sélectionner une image",
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

      const filename = imageUri.split("/").pop() || "banner.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image";
      formData.append("image", { uri: imageUri, name: filename, type } as any);

      const { data } = await api.post("banners", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data?.success) {
        Toast.show({
          type: "success",
          text1: t("success") || "Succès",
          text2: t("bannerCreated") || "Bannière ajoutée avec succès",
        });
        router.back();
      }
    } catch (error: any) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: t("failedToCreateBanner") || "Échec de l'ajout",
        text2: error.response?.data?.message || t("somethingWentWrong") || "Une erreur est survenue",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={t("addBanner") || "Ajouter une bannière"} showMenu={false} showBack />
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
    </SafeAreaView>
  );
}