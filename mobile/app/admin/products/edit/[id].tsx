import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView, Text, TextInput, TouchableOpacity, View,
  Switch, Image, ActivityIndicator, Platform, Modal,
  FlatList, TouchableWithoutFeedback, Alert,
} from "react-native";
import Toast from "react-native-toast-message";
import { COLORS, CATEGORIES } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Header from "@/components/Header";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";

export default function EditProduct() {
  const { getToken } = useAuth();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [sizes, setSizes] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<string[]>([]);

  // Video state
  const [existingVideo, setExistingVideo] = useState<string | null>(null);
  const [newVideoUri, setNewVideoUri] = useState<string | null>(null);
  const [newVideoName, setNewVideoName] = useState<string | null>(null);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await api.get(`/products/${id}`);
        if (data.success) {
          const product = data.data;
          setName(product.name);
          setDescription(product.description || "");
          setPrice(product.price.toString());
          setStock(product.stock.toString());
          setCategory(
            (typeof product.category === "object"
              ? product.category.name
              : product.category
            ).toLowerCase()
          );
          setIsFeatured(product.isFeatured);
          if (product.sizes)
            setSizes(Array.isArray(product.sizes) ? product.sizes.join(", ") : product.sizes);
          if (product.images && Array.isArray(product.images)) {
            setExistingImages(product.images);
          } else if (product.images) {
            setExistingImages([product.images]);
          }
          if (product.video) setExistingVideo(product.video);
        }
      } catch (error: any) {
        console.error("Failed to fetch product:", error);
        Toast.show({
          type: "error",
          text1: t("failedToFetchProduct"),
          text2: error.response?.data?.message || t("somethingWentWrong"),
        });
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10 - (existingImages.length + newImages.length),
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map((asset) => asset.uri);
      setNewImages([...newImages, ...uris]);
    }
  };

  // ✅ Utilise expo-image-picker pour la vidéo
  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"] as any,
      allowsMultipleSelection: false,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setNewVideoUri(asset.uri);
      const filename = asset.uri.split("/").pop() || "product-video.mp4";
      setNewVideoName(filename);
    }
  };

  // ── Supprimer vidéo (route séparée) ──
  const handleDeleteVideo = () => {
    Alert.alert(
      t("deleteVideo") || "Supprimer la vidéo",
      t("deleteVideoConfirm") || "Êtes-vous sûr de vouloir supprimer cette vidéo ?",
      [
        { text: t("cancel") || "Annuler", style: "cancel" },
        {
          text: t("delete") || "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingVideo(true);
              const token = await getToken();
              await api.delete(`/products/${id}/video`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setExistingVideo(null);
              Toast.show({
                type: "success",
                text1: t("videoDeleted") || "Vidéo supprimée",
              });
            } catch (error: any) {
              Toast.show({
                type: "error",
                text1: t("failedToDeleteVideo") || "Erreur lors de la suppression",
                text2: error.response?.data?.message || t("somethingWentWrong"),
              });
            } finally {
              setDeletingVideo(false);
            }
          },
        },
      ]
    );
  };

  // ── Uploader nouvelle vidéo (route séparée) ──
  const handleUploadVideo = async () => {
    if (!newVideoUri) return;
    try {
      setUploadingVideo(true);
      const token = await getToken();
      const videoForm = new FormData();
      videoForm.append("video", {
        uri: newVideoUri,
        name: newVideoName || "product-video.mp4",
        type: "video/mp4",
      } as any);
      const { data } = await api.post(`/products/${id}/video`, videoForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setExistingVideo(data.data.video);
        setNewVideoUri(null);
        setNewVideoName(null);
        Toast.show({
          type: "success",
          text1: t("videoUploaded") || "Vidéo uploadée avec succès",
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("failedToUploadVideo") || "Erreur lors de l'upload",
        text2: error.response?.data?.message || t("somethingWentWrong"),
      });
    } finally {
      setUploadingVideo(false);
    }
  };

  const removeExistingImage = (index: number) => {
    const updated = [...existingImages];
    updated.splice(index, 1);
    setExistingImages(updated);
  };

  const removeNewImage = (index: number) => {
    const updated = [...newImages];
    updated.splice(index, 1);
    setNewImages(updated);
  };

  const handleSubmit = async () => {
    if (!name || !price || sizes.length < 1) {
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
      formData.append("name", name);
      formData.append("description", description);
      formData.append("price", price);
      formData.append("stock", stock);
      formData.append("category", category.toLowerCase());
      formData.append("isFeatured", String(isFeatured));
      formData.append("sizes", sizes);
      existingImages.forEach((img) => formData.append("existingImages", img));

      for (const [i, uri] of newImages.entries()) {
        const filename = `new-image-${i}.jpg`;
        if (Platform.OS === "web") {
          const blob = await (await fetch(uri)).blob();
          formData.append("images", new File([blob], filename, { type: "image/jpeg" }));
        } else {
          formData.append("images", { uri, name: filename, type: "image/jpeg" } as any);
        }
      }

      const { data } = await api.put(`/products/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        Toast.show({
          type: "success",
          text1: t("success"),
          text2: t("productUpdatedSuccess"),
        });
        router.replace("/admin/products");
      }
    } catch (error: any) {
      console.error("Failed to update product:", error);
      Toast.show({
        type: "error",
        text1: t("failedToUpdateProduct"),
        text2: error.response?.data?.message || t("somethingWentWrong"),
      });
    } finally {
      setSubmitting(false);
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
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title={t("editProduct")} showBack />

      <ScrollView className="flex-1 bg-surface p-4">
        <View className="bg-white p-4 rounded-xl border border-gray-100 mb-20">
          {/* Product Name */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("productName")} *
          </Text>
          <TextInput
            className="bg-surface p-3 rounded-lg mb-4 text-primary"
            value={name} onChangeText={setName}
          />

          {/* Price */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("price")} ({formatPrice(0).replace(/[\d.,]/g, "").trim()}) *
          </Text>
          <TextInput
            className="bg-surface p-3 rounded-lg mb-4 text-primary"
            keyboardType="decimal-pad"
            value={price} onChangeText={setPrice}
            placeholder={price ? formatPrice(parseFloat(price) || 0) : "0.00"}
            placeholderTextColor={COLORS.secondary}
          />

          {/* Stock */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("stockLevel")}
          </Text>
          <TextInput
            className="bg-surface p-3 rounded-lg mb-4 text-primary"
            keyboardType="number-pad"
            value={stock} onChangeText={setStock}
          />

          {/* Sizes */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("sizesCommaSeparated")}
          </Text>
          <TextInput
            className="bg-surface p-3 rounded-lg mb-4 text-primary"
            placeholder={t("sizesPlaceholder")}
            value={sizes} onChangeText={setSizes}
          />

          {/* Category */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("category")}
          </Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="bg-surface p-3 rounded-lg mb-4 flex-row justify-between items-center"
          >
            <Text className="text-primary">
              {category ? t(category) : t("selectCategory")}
            </Text>
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

          {/* Images */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("images")}
          </Text>
          <View className="mb-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {existingImages.map((uri, index) => (
                <View key={`existing-${index}`} className="relative mr-2">
                  <Image source={{ uri }} className="w-24 h-24 rounded-lg" />
                  <TouchableOpacity
                    onPress={() => removeExistingImage(index)}
                    className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
                  >
                    <Ionicons name="close" size={12} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
              {newImages.map((uri, index) => (
                <View key={`new-${index}`} className="relative mr-2">
                  <Image source={{ uri }} className="w-24 h-24 rounded-lg border-2 border-primary" />
                  <TouchableOpacity
                    onPress={() => removeNewImage(index)}
                    className="absolute top-1 right-1 bg-primary rounded-full p-1"
                  >
                    <Ionicons name="close" size={12} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
              {existingImages.length + newImages.length < 10 && (
                <TouchableOpacity
                  onPress={pickImages}
                  className="w-24 h-24 rounded-lg bg-gray-100 justify-center items-center border border-dashed border-gray-300"
                >
                  <Ionicons name="add" size={24} color={COLORS.secondary} />
                  <Text className="text-xs text-secondary mt-1">{t("add")}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* ───── VIDEO SECTION ───── */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("productVideo") || "Vidéo du produit"}
          </Text>
          <Text className="text-xs mb-3" style={{ color: "#9CA3AF", marginTop: -2 }}>
            {t("optional") || "Optionnel"}
          </Text>

          {/* Vidéo existante sur le serveur */}
          {existingVideo && !newVideoUri && (
            <View style={{
              borderRadius: 14, overflow: "hidden",
              borderWidth: 1, borderColor: "#E5E7EB",
              marginBottom: 16,
            }}>
              <View style={{
                flexDirection: "row", alignItems: "center",
                backgroundColor: "#F0FDF4", padding: 12,
              }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 10,
                  backgroundColor: "#DCFCE7",
                  alignItems: "center", justifyContent: "center", marginRight: 12,
                }}>
                  <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#15803D" }}>
                    {t("videoUploaded") || "Vidéo enregistrée"}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }} numberOfLines={1}>
                    {existingVideo.split("/").pop()}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E5E7EB" }}>
                <TouchableOpacity
                  onPress={pickVideo}
                  style={{
                    flex: 1, flexDirection: "row", alignItems: "center",
                    justifyContent: "center", paddingVertical: 12, gap: 6,
                    borderRightWidth: 0.5, borderRightColor: "#E5E7EB",
                  }}
                >
                  <Ionicons name="swap-horizontal-outline" size={16} color={COLORS.primary} />
                  <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: "500" }}>
                    {t("replaceVideo") || "Remplacer"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDeleteVideo}
                  disabled={deletingVideo}
                  style={{
                    flex: 1, flexDirection: "row", alignItems: "center",
                    justifyContent: "center", paddingVertical: 12, gap: 6,
                  }}
                >
                  {deletingVideo ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text style={{ fontSize: 13, color: "#EF4444", fontWeight: "500" }}>
                        {t("delete") || "Supprimer"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Nouvelle vidéo sélectionnée (en attente d'upload) */}
          {newVideoUri && (
            <View style={{
              borderRadius: 14, overflow: "hidden",
              borderWidth: 1, borderColor: COLORS.primary + "40",
              marginBottom: 16,
            }}>
              <View style={{
                flexDirection: "row", alignItems: "center",
                backgroundColor: COLORS.primary + "08", padding: 12,
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
                    {newVideoName || "video.mp4"}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                    {t("pendingUpload") || "En attente d'upload"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => { setNewVideoUri(null); setNewVideoName(null); }}
                  style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: "#FEE2E2",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleUploadVideo}
                disabled={uploadingVideo}
                style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "center",
                  paddingVertical: 12, gap: 8,
                  backgroundColor: COLORS.primary,
                  opacity: uploadingVideo ? 0.7 : 1,
                }}
              >
                {uploadingVideo ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={16} color="white" />
                    <Text style={{ color: "white", fontWeight: "600", fontSize: 13 }}>
                      {t("uploadVideo") || "Uploader la vidéo"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Aucune vidéo — zone pour en choisir une */}
          {!existingVideo && !newVideoUri && (
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
            value={description} onChangeText={setDescription}
          />

          {/* Featured */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-primary font-bold">{t("featuredProduct")}</Text>
            <Switch
              value={isFeatured} onValueChange={setIsFeatured}
              trackColor={{ false: "#eee", true: COLORS.primary }}
            />
          </View>

          <TouchableOpacity
            className={`bg-primary p-4 rounded-xl items-center ${submitting ? "opacity-70" : ""}`}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-medium text-lg">
                {t("updateProduct")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}