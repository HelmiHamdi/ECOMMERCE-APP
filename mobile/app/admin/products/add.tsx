import React, { useState } from "react";
import {
  ScrollView, Text, TextInput, TouchableOpacity, View,
  Switch, Image, ActivityIndicator, Modal, FlatList,
  TouchableWithoutFeedback,
} from "react-native";
import Toast from "react-native-toast-message";
import { COLORS, CATEGORIES } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import Header from "@/components/Header";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";

export default function AddProduct() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const { currency, formatPrice } = useCurrency();
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("men");
  const [sizes, setSizes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);

  // Video state
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map((asset) => asset.uri);
      setImages(uris.slice(0, 10));
    }
  };

  // ✅ Utilise expo-image-picker au lieu de expo-document-picker
  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"] as any,
      allowsMultipleSelection: false,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setVideoUri(asset.uri);
      // Extraire le nom du fichier depuis l'URI
      const filename = asset.uri.split("/").pop() || "product-video.mp4";
      setVideoName(filename);
    }
  };

  const removeVideo = () => {
    setVideoUri(null);
    setVideoName(null);
  };

  const handleSubmit = async () => {
    if (!name || !price || !category || sizes.length < 1) {
      Toast.show({
        type: "error",
        text1: t("missingFields"),
        text2: t("fillRequiredFields"),
      });
      return;
    }
    try {
      setSubmitting(true);
      const token = await getToken();
      const formData = new FormData();

      const fields = {
        name, description, price,
        stock: stock || "0",
        category: category.toLowerCase(),
        isFeatured: String(isFeatured),
        sizes,
      };
      Object.entries(fields).forEach(([key, value]) => formData.append(key, value));

      for (const [i, uri] of images.entries()) {
        formData.append("images", {
          uri, name: `image-${i}.jpg`, type: "image/jpeg",
        } as any);
      }

      const { data } = await api.post("/products", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!data?.success) throw new Error("Upload failed");

      // Upload vidéo séparément si fournie
      if (videoUri && data.data?._id) {
        const videoForm = new FormData();
        videoForm.append("video", {
          uri: videoUri,
          name: videoName || "product-video.mp4",
          type: "video/mp4",
        } as any);
        await api.post(`/products/${data.data._id}/video`, videoForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      Toast.show({
        type: "success",
        text1: t("success"),
        text2: t("productCreated"),
      });
      router.replace("/admin/products");
    } catch (error: any) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: t("failedToCreateProduct"),
        text2: error.response?.data?.message || t("somethingWrong"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title={t("addProduct")} showBack />

      <ScrollView className="flex-1 bg-surface p-4">
        <View className="bg-white p-4 rounded-xl shadow-sm mb-20">
          {/* Product Name */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("productName")} *
          </Text>
          <TextInput
            className="bg-surface p-3 rounded-lg mb-4 text-primary"
            placeholder={t("productNamePlaceholder")}
            value={name}
            onChangeText={setName}
          />

          {/* Price */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("price")} ($) *
          </Text>
          <TextInput
            className="bg-surface p-3 rounded-lg text-primary"
            placeholder={t("pricePlaceholder")}
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
          />
          {price.length > 0 && !isNaN(parseFloat(price)) && currency !== "USD" && (
            <Text className="text-secondary text-xs mb-4 mt-1">
              ≈ {formatPrice(parseFloat(price))} ({currency})
            </Text>
          )}
          {(price.length === 0 || isNaN(parseFloat(price)) || currency === "USD") && (
            <View className="mb-4" />
          )}

          {/* Category */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("category")}
          </Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="bg-surface p-3 rounded-lg mb-4 flex-row justify-between items-center"
          >
            <Text className="text-primary">{t(category)}</Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.secondary} />
          </TouchableOpacity>

          <Modal visible={modalVisible} animationType="slide" transparent>
            <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
              <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-2xl p-4 max-h-[50%]">
                  <Text className="text-lg font-bold text-center mb-4">
                    {t("selectCategory")}
                  </Text>
                  <FlatList
                    data={CATEGORIES}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        className={`p-4 border-b ${category === item.nameKey ? "bg-primary/5" : ""}`}
                        onPress={() => { setCategory(item.nameKey); setModalVisible(false); }}
                      >
                        <View className="flex-row justify-between">
                          <Text className={`${category === item.nameKey ? "font-bold text-primary" : ""}`}>
                            {t(item.nameKey)}
                          </Text>
                          {category === item.nameKey && (
                            <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Stock */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("stockLevel")}
          </Text>
          <TextInput
            className="bg-surface p-3 rounded-lg mb-4 text-primary"
            placeholder={t("stockPlaceholder")}
            keyboardType="number-pad"
            value={stock}
            onChangeText={setStock}
          />

          {/* Sizes */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("sizesCommaSeparated")}
          </Text>
          <TextInput
            className="bg-surface p-3 rounded-lg mb-4 text-primary"
            placeholder={t("sizesPlaceholderAdd")}
            value={sizes}
            onChangeText={setSizes}
          />

          {/* Images */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("productImagesMax10")}
          </Text>
          <TouchableOpacity onPress={pickImages} className="mb-4">
            {images.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {images.map((uri, i) => (
                  <Image key={i} source={{ uri }} className="w-32 h-32 rounded-lg mr-2" />
                ))}
              </ScrollView>
            ) : (
              <View className="w-full h-32 rounded-lg bg-gray-100 justify-center items-center border border-dashed border-gray-300">
                <Ionicons name="cloud-upload-outline" size={32} color={COLORS.secondary} />
                <Text className="text-secondary text-xs mt-2">{t("tapToUploadImages")}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ───── VIDEO FIELD (optional) ───── */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("productVideo") || "Vidéo du produit"}
          </Text>
          <Text className="text-xs mb-2" style={{ color: "#9CA3AF", marginTop: -4 }}>
            {t("optional") || "Optionnel"}
          </Text>

          {videoUri ? (
            <View style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: COLORS.primary + "10",
              borderRadius: 12, padding: 12, marginBottom: 16,
              borderWidth: 1, borderColor: COLORS.primary + "30",
            }}>
              <View style={{
                width: 40, height: 40, borderRadius: 10,
                backgroundColor: COLORS.primary + "20",
                alignItems: "center", justifyContent: "center", marginRight: 12,
              }}>
                <Ionicons name="videocam" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.primary }} numberOfLines={1}>
                  {videoName || "video.mp4"}
                </Text>
                <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                  {t("videoReadyToUpload") || "Prêt à être uploadé"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={removeVideo}
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: "#FEE2E2",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={pickVideo}
              style={{
                borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed",
                borderColor: "#D1D5DB", backgroundColor: "#F9FAFB",
                padding: 16, alignItems: "center", marginBottom: 16,
              }}
            >
              <View style={{
                width: 48, height: 48, borderRadius: 24,
                backgroundColor: COLORS.primary + "10",
                alignItems: "center", justifyContent: "center", marginBottom: 8,
              }}>
                <Ionicons name="videocam-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.primary, marginBottom: 2 }}>
                {t("addVideo") || "Ajouter une vidéo"}
              </Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
                {t("videoFormats") || "MP4, MOV · depuis la galerie"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Description */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("description")}
          </Text>
          <TextInput
            className="bg-surface p-3 rounded-lg mb-6 text-primary h-24"
            multiline textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />

          {/* Featured */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-primary font-bold">{t("featuredProduct")}</Text>
            <Switch
              value={isFeatured}
              onValueChange={setIsFeatured}
              trackColor={{ false: "#eee", true: COLORS.primary }}
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            className={`bg-primary p-4 rounded-xl items-center ${submitting ? "opacity-70" : ""}`}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">
                {t("createProduct")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}