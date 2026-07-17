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
import React, { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { COLORS } from "@/constants";
import { Product } from "@/constants/types";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext"; 

const { width, height } = Dimensions.get("window");

export default function ProductDetail() {
  // 👇 CORRECTION — offerId lu depuis l'URL (transmis par OffersScreen quand
  // le produit a des tailles et qu'il faut passer par cette page avant
  // d'ajouter au panier). Sans ça, l'offre était perdue et le prix normal
  // était appliqué au lieu du prix promo.
  const { id, offerId } = useLocalSearchParams<{ id: string; offerId?: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency(); 
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart, cartItems, itemCount } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const fetchProduct = useCallback(async () => {
    try {
      // 👇 Pas besoin de casser le cache manuellement ici : le middleware
      // `cacheMiddleware` invalide déjà la clé "/api/products/:id" dès
      // qu'une offre est créée/modifiée/supprimée (invalidateCache("products")
      // côté offerController). Le seul problème était que ce composant ne
      // refetchait pas au retour sur l'écran — résolu par useFocusEffect.
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
  }, [id]);

  // 👇 CORRECTION — useFocusEffect au lieu de useEffect : re-fetch le
  // produit à CHAQUE fois que cet écran reprend le focus (retour depuis la
  // page "Gérer les offres" après suppression d'une offre, par exemple),
  // pas uniquement au premier montage du composant.
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProduct();
    }, [fetchProduct])
  );

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

  // l'offre active vient du backend (attachActiveOffers dans productController)
  const hasActiveOffer = !!product.hasActiveOffer && product.finalPrice != null;

  const handleAddToCart = () => {
    if (!selectedSize) {
      Toast.show({
        type: "info",
        text1: t("noSizeSelected"),
        text2: t("pleaseSelectSize"),
      });
      return;
    }
    // 👇 CORRECTION — on transmet l'offerId (venant de l'URL, donc de
    // l'écran Offres) à addToCart, pour que le backend calcule et applique
    // bien le prix promo sur l'item du panier au lieu du prix normal.
    addToCart(product, selectedSize || "", offerId);
  };

  const openFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setFullscreenVisible(true);
  };

  return (
    <View className="flex-1 bg-white">
    
      <Modal
        visible={fullscreenVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setFullscreenVisible(false)}
        statusBarTranslucent
      >
        <StatusBar hidden />
        <View style={{ flex: 1, backgroundColor: "#000" }}>
      
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

          {/* badge -X% en overlay sur l'image si offre active */}
          {hasActiveOffer && (
            <View
              style={{
                position: "absolute",
                top: 56,
                left: 16,
                backgroundColor: "#EF4444",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>
                -{product.discountPercentage}%
              </Text>
            </View>
          )}

          
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

          {/* affiche le prix promo si l'offre est active */}
          {hasActiveOffer ? (
            <View className="flex-row items-center flex-wrap" style={{ gap: 8 }}>
              <Text
                style={{
                  fontSize: 15,
                  color: "#9CA3AF",
                  textDecorationLine: "line-through",
                }}
              >
                {formatPrice(product.price)}
              </Text>
              <Text className="text-2xl font-bold">
                {formatPrice(product.finalPrice!)}
              </Text>
              <View
                style={{
                  backgroundColor: "#EF4444",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 11 }}>
                  -{product.discountPercentage}%
                </Text>
              </View>
            </View>
          ) : (
            <Text className="text-2xl font-bold ml-1">
              {formatPrice(product.price)}
            </Text>
          )}

          {/* 👇 AJOUT — petit rappel visuel quand on arrive depuis une offre,
              pour que l'utilisateur comprenne pourquoi il doit choisir une
              taille avant que le prix promo soit appliqué au panier */}
          {offerId && (
            <View
              className="flex-row items-center self-start mt-2 px-2 py-1 rounded-lg"
              style={{ backgroundColor: `${COLORS.primary}12` }}
            >
              <Ionicons name="pricetag" size={12} color={COLORS.primary} />
              <Text
                className="ml-1 font-bold text-[11px]"
                style={{ color: COLORS.primary }}
              >
                {t("offerApplied") || "Offre appliquée"}
              </Text>
            </View>
          )}

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