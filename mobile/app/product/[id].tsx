import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  Modal,
  StatusBar,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS } from "@/constants";
import { Product } from "@/constants/types";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext"; // ← AJOUT

const { width, height } = Dimensions.get("window");

export default function ProductDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency(); // ← AJOUT
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart, cartItems, itemCount } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const fetchProduct = async () => {
    try {
      const { data } = await api.get(`/products/${id}`);
      setProduct(data.data);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("failedToFetchProduct"),
        text2: error.response?.data?.message || t("productCreated"),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <Text className="text-primary text-lg">{t("productNotFound")}</Text>
      </SafeAreaView>
    );
  }

  const isLiked = isInWishlist(product._id);

  const handleAddToCart = () => {
    if (!selectedSize) {
      Toast.show({
        type: "info",
        text1: t("noSizeSelected"),
        text2: t("pleaseSelectSize"),
      });
      return;
    }
    addToCart(product, selectedSize || "");
  };

  const openFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setFullscreenVisible(true);
  };

  return (
    <View className="flex-1 bg-white">
      {/* ───── Fullscreen Image Modal ───── */}
      <Modal
        visible={fullscreenVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setFullscreenVisible(false)}
        statusBarTranslucent
      >
        <StatusBar hidden />
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          {/* Slider fullscreen */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            contentOffset={{ x: fullscreenIndex * width, y: 0 }}
            onScroll={(e) => {
              const slide = Math.round(
                e.nativeEvent.contentOffset.x /
                  e.nativeEvent.layoutMeasurement.width
              );
              setFullscreenIndex(slide);
            }}
            style={{ flex: 1 }}
          >
            {product.images?.map((img, index) => (
              <Image
                key={index}
                source={{ uri: img }}
                style={{ width, height }}
                resizeMode="contain"
              />
            ))}
          </ScrollView>

          {/* Bouton fermer */}
          <TouchableOpacity
            onPress={() => setFullscreenVisible(false)}
            style={{
              position: "absolute",
              top: 50,
              left: 16,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(0,0,0,0.5)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Icone wishlist */}
          <TouchableOpacity
            onPress={() => toggleWishlist(product)}
            style={{
              position: "absolute",
              top: 50,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(0,0,0,0.5)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={24}
              color={isLiked ? COLORS.accent : "#fff"}
            />
          </TouchableOpacity>

          {/* Dots fullscreen */}
          <View
            style={{
              position: "absolute",
              bottom: 40,
              left: 0,
              right: 0,
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {product.images?.map((_, index) => (
              <View
                key={index}
                style={{
                  height: 8,
                  borderRadius: 4,
                  width: index === fullscreenIndex ? 24 : 8,
                  backgroundColor:
                    index === fullscreenIndex ? "#fff" : "rgba(255,255,255,0.4)",
                }}
              />
            ))}
          </View>

          {/* Compteur image */}
          <View
            style={{
              position: "absolute",
              bottom: 60,
              right: 20,
              backgroundColor: "rgba(0,0,0,0.5)",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12 }}>
              {fullscreenIndex + 1} / {product.images?.length}
            </Text>
          </View>
        </View>
      </Modal>

      {/* ───── Contenu principal ───── */}
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="relative bg-gray-100 mt-14" style={{ height: 450 }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const slide = Math.round(
                e.nativeEvent.contentOffset.x /
                  e.nativeEvent.layoutMeasurement.width
              );
              setActiveImageIndex(slide);
            }}
          >
            {product.images?.map((img, index) => (
              // ✅ Clic sur l'image → ouvre le fullscreen
              <TouchableOpacity
                key={index}
                activeOpacity={0.95}
                onPress={() => openFullscreen(index)}
              >
                <Image
                  source={{ uri: img }}
                  style={{ width, height: 450 }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Boutons header */}
          <View className="absolute top-8 left-4 right-4 flex-row justify-between items-center z-10">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-white/80 rounded-full items-center justify-center"
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleWishlist(product)}
              className="w-10 h-10 bg-white/80 rounded-full items-center justify-center"
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={24}
                color={isLiked ? COLORS.accent : COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Dots + icone fullscreen */}
          <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-2 items-center">
            {product.images?.map((_, index) => (
              <View
                key={index}
                className={`h-2 rounded-full ${
                  index === activeImageIndex
                    ? "w-6 bg-primary"
                    : "w-2 bg-gray-300"
                }`}
              />
            ))}
          </View>

          {/* Icone expand en bas à droite */}
          <TouchableOpacity
            onPress={() => openFullscreen(activeImageIndex)}
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "rgba(0,0,0,0.4)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="expand-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ───── Détails produit ───── */}
        <View className="px-4">
          <View className="flex-row justify-between items-start mb-2 mt-5">
            <Text className="text-2xl font-bold text-primary flex-1 mr-4">
              {product.name}
            </Text>
            <View className="flex-row justify-between items-start mb-2">
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text className="text-sm font-bold ml-1">4.6</Text>
              <Text className="text-xs text-secondary ml-1">(85)</Text>
            </View>
          </View>

          {/* ✅ FIX : prix formaté selon la devise active */}
          <Text className="text-2xl font-bold ml-1">
            {formatPrice(product.price)}
          </Text>

          {product.sizes && product.sizes.length > 0 && (
            <>
              <Text className="text-base font-bold text-primary mb-3 mt-4">
                {t("sizeLabel")}
              </Text>
              <View className="flex-row gap-3 mb-6 flex-wrap">
                {product.sizes.map((size) => (
                  <TouchableOpacity
                    key={size}
                    onPress={() => setSelectedSize(size)}
                    className={`w-12 h-12 rounded-full items-center justify-center border ${
                      selectedSize === size
                        ? "bg-primary border-primary"
                        : "bg-white border-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selectedSize === size ? "text-white" : "text-primary"
                      }`}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text className="text-base font-bold text-primary mb-2">
            {t("description")}
          </Text>
          <Text className="text-secondary leading-6 mb-6">
            {product.description}
          </Text>
        </View>
      </ScrollView>

      {/* ───── Footer Add to Cart ───── */}
      <View className="absolute bottom-10 left-0 flex-row right-0 p-4 bg-white border-t border-gray-100">
        <TouchableOpacity
          onPress={handleAddToCart}
          className="w-4/5 bg-primary py-4 rounded-full items-center shadow-lg flex-row justify-center"
        >
          <Ionicons name="bag-outline" size={20} color="white" />
          <Text className="text-white font-bold text-base ml-2">
            {t("addToCart")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/cart")}
          className="w-1/5 py-3 flex-row relative justify-center"
        >
          <Ionicons name="cart-outline" size={24} />
          <View className="absolute top-2 right-4 size-4 z-10 bg-black rounded-full justify-center items-center">
            <Text className="text-white text-[9px]">{itemCount}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}