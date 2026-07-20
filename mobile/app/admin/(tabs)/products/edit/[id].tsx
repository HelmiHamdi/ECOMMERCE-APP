import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
} from "react-native";
import Toast from "react-native-toast-message";
import { COLORS, CATEGORIES, SIZE_REQUIRED_CATEGORIES } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Header from "@/components/Header";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { PRODUCT_STATUS_LIST, ProductStatusKey } from "@/constants";
import StatusBadge from "@/components/StatusBadge";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext"; // ← AJOUT

export default function EditProduct() {
  const { getToken } = useAuth();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency(); // ← AJOUT

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
  const [status, setStatus] = useState<ProductStatusKey>("in_stock");
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<string[]>([]);
  const requiresSizes = SIZE_REQUIRED_CATEGORIES.includes(category);

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
            ).toLowerCase(),
          );
          setIsFeatured(product.isFeatured);
          setStatus(product.status || "in_stock");
          if (product.sizes)
            setSizes(
              Array.isArray(product.sizes)
                ? product.sizes.join(", ")
                : product.sizes,
            );
          if (product.images && Array.isArray(product.images)) {
            setExistingImages(product.images);
          } else if (product.images) {
            setExistingImages([product.images]);
          }
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
    if (!name || !price || (requiresSizes && sizes.trim().length < 1)) {
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
      formData.append("status", status);
      formData.append("sizes", requiresSizes ? sizes : "");
      existingImages.forEach((img) => formData.append("existingImages", img));
      for (const [i, uri] of newImages.entries()) {
        const filename = `new-image-${i}.jpg`;
        if (Platform.OS === "web") {
          const blob = await (await fetch(uri)).blob();
          formData.append(
            "images",
            new File([blob], filename, { type: "image/jpeg" }),
          );
        } else {
          formData.append("images", {
            uri,
            name: filename,
            type: "image/jpeg",
          } as any);
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
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("productName")} *
          </Text>
          <TextInput
            className="bg-surface p-3 rounded-lg mb-4 text-primary"
            value={name}
            onChangeText={setName}
          />

          {/* Label du prix affiché en devise courante ← MODIFIÉ */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("price")} (
            {formatPrice(0)
              .replace(/[\d.,]/g, "")
              .trim()}
            ) *
          </Text>
          <TextInput
            className="bg-surface p-3 rounded-lg mb-4 text-primary"
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
            placeholder={price ? formatPrice(parseFloat(price) || 0) : "0.00"}
            placeholderTextColor={COLORS.secondary}
          />

          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("stockLevel")}
          </Text>
          <TextInput
            className="bg-surface p-3 rounded-lg mb-4 text-primary"
            keyboardType="number-pad"
            value={stock}
            onChangeText={setStock}
          />

          {requiresSizes && (
            <>
              <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                {t("sizesCommaSeparated")} *
              </Text>
              <TextInput
                className="bg-surface p-3 rounded-lg mb-4 text-primary"
                placeholder={t("sizesPlaceholder")}
                value={sizes}
                onChangeText={setSizes}
              />
            </>
          )}

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
                        onPress={() => {
                          setCategory(item.nameKey);
                          setModalVisible(false);
                        }}
                      >
                        <View className="flex-row justify-between">
                          <Text
                            className={`${category === item.nameKey ? "font-bold text-primary" : ""}`}
                          >
                            {t(item.nameKey)}
                          </Text>
                          {category === item.nameKey && (
                            <Ionicons
                              name="checkmark"
                              size={20}
                              color={COLORS.primary}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* ------- Sélecteur de statut du produit ------- */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("productStatus") ?? "Statut du produit"}
          </Text>
          <TouchableOpacity
            onPress={() => setStatusModalVisible(true)}
            className="bg-surface p-3 rounded-lg mb-4 flex-row justify-between items-center"
          >
            <StatusBadge status={status} />
            <Ionicons name="chevron-down" size={20} color={COLORS.secondary} />
          </TouchableOpacity>

          <Modal visible={statusModalVisible} animationType="slide" transparent>
            <TouchableWithoutFeedback onPress={() => setStatusModalVisible(false)}>
              <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-2xl p-4">
                  <Text className="text-lg font-bold text-center mb-4">
                    {t("selectStatus") ?? "Choisir un statut"}
                  </Text>
                  {PRODUCT_STATUS_LIST.map((s) => (
                    <TouchableOpacity
                      key={s.key}
                      className={`p-4 border-b flex-row justify-between items-center ${
                        status === s.key ? "bg-primary/5" : ""
                      }`}
                      onPress={() => {
                        setStatus(s.key as ProductStatusKey);
                        setStatusModalVisible(false);
                      }}
                    >
                      <StatusBadge status={s.key} />
                      {status === s.key && (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={COLORS.primary}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

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
                  <Image
                    source={{ uri }}
                    className="w-24 h-24 rounded-lg border-2 border-primary"
                  />
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
                  <Text className="text-xs text-secondary mt-1">
                    {t("add")}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("description")}
          </Text>
          <TextInput
            className="bg-surface p-3 rounded-lg mb-6 text-primary h-24"
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />

          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-primary font-bold">
              {t("featuredProduct")}
            </Text>
            <Switch
              value={isFeatured}
              onValueChange={setIsFeatured}
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