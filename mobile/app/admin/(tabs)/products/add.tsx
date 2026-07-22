import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
} from "react-native";
import Toast from "react-native-toast-message";

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { PRODUCT_STATUS_LIST, ProductStatusKey,COLORS, CATEGORIES, SIZE_REQUIRED_CATEGORIES  } from "@/constants";
import { Stack, useRouter } from "expo-router";
import Header from "@/components/Header";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import StatusBadge from "@/components/StatusBadge";

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
  const [status, setStatus] = useState<ProductStatusKey>("in_stock");
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const requiresSizes = SIZE_REQUIRED_CATEGORIES.includes(category);
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

  const handleSubmit = async () => {
    if (
      !name ||
      !price ||
      !category ||
      (requiresSizes && sizes.trim().length < 1)
    ) {
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
        name,
        description,
        price, // ✅ toujours envoyé en TND (devise de référence côté backend)
        stock: stock || "0",
        category: category.toLowerCase(),
        status,
        isFeatured: String(isFeatured),
        sizes: requiresSizes ? sizes : "",
      };

      Object.entries(fields).forEach(([key, value]) =>
        formData.append(key, value),
      );

      for (const [i, uri] of images.entries()) {
        const filename = `image-${i}.jpg`;
        formData.append("images", {
          uri,
          name: filename,
          type: "image/jpeg",
        } as any);
      }

      const { data } = await api.post("/products", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!data?.success) throw new Error("Upload failed");

      Toast.show({
        type: "success",
        text1: t("success"),
        text2: t("productCreated"),
      });
      router.replace("/admin/products");
    } catch (error: any) {
      console.error("FULL ERROR:", JSON.stringify(error.response?.data, null, 2));
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
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("productName")} *
          </Text>
          <TextInput
            className="bg-surface p-3 rounded-lg mb-4 text-primary"
            placeholder={t("productNamePlaceholder")}
            value={name}
            onChangeText={setName}
          />

          {/* 👇 CORRECTION — le champ prix est TOUJOURS en DT (TND), quelle que
              soit la devise personnelle de l'admin. Avant : label "($)" fixe,
              trompeur puisque la valeur saisie est stockée telle quelle en TND. */}
          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("price")} (DT) *
          </Text>
          <TextInput
            className="bg-surface p-3 rounded-lg text-primary"
            placeholder={t("pricePlaceholder")}
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
          />

          {/* Aperçu converti dans la devise d'affichage choisie par l'admin,
              seulement si elle diffère de la devise réellement stockée (TND).
              Avant : comparait à "USD" au lieu de "TND". */}
          {price.length > 0 &&
            !isNaN(parseFloat(price)) &&
            currency !== "TND" && (
              <Text className="text-secondary text-xs mb-4 mt-1">
                ≈ {formatPrice(parseFloat(price))} ({currency})
              </Text>
            )}
          {(price.length === 0 ||
            isNaN(parseFloat(price)) ||
            currency === "TND") && <View className="mb-4" />}

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
              <View className="flex-1 justify-end bg-black/50 mb-10">
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
                      <StatusBadge status={s.key as ProductStatusKey} />
                      {status === s.key && (
                        <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

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

          {requiresSizes && (
            <>
              <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                {t("sizesCommaSeparated")} *
              </Text>
              <TextInput
                className="bg-surface p-3 rounded-lg mb-4 text-primary"
                placeholder={t("sizesPlaceholderAdd")}
                value={sizes}
                onChangeText={setSizes}
              />
            </>
          )}

          <Text className="text-secondary text-xs font-bold mb-1 uppercase">
            {t("productImagesMax10")}
          </Text>
          <TouchableOpacity onPress={pickImages} className="mb-4">
            {images.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {images.map((uri, i) => (
                  <Image
                    key={i}
                    source={{ uri }}
                    className="w-32 h-32 rounded-lg mr-2"
                  />
                ))}
              </ScrollView>
            ) : (
              <View className="w-full h-32 rounded-lg bg-gray-100 justify-center items-center border border-dashed border-gray-300">
                <Ionicons
                  name="cloud-upload-outline"
                  size={32}
                  color={COLORS.secondary}
                />
                <Text className="text-secondary text-xs mt-2">
                  {t("tapToUploadImages")}
                </Text>
              </View>
            )}
          </TouchableOpacity>

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