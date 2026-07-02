import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router"; // ✅ AJOUT useFocusEffect
import Header from "@/components/Header";
import {
  ScrollView,
  View,
  Image,
  Dimensions,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CATEGORIES, COLORS } from "@/constants";
import CategoryItem from "@/components/CategoryItem";
import { Product, Banner } from "@/constants/types";
import ProductCard from "@/components/ProductCard";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";

const { width } = Dimensions.get("window");

export default function Home() {
  const router = useRouter();
  const { t } = useLanguage();
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const categories = [
    { id: "all", nameKey: "all", name: t("all"), icon: "grid" },
    ...CATEGORIES,
  ];
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [bannersError, setBannersError] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const fetchProducts = async () => {
    try {
      const { data } = await api.get("products");
      setProducts(data.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      console.timeEnd("fetchProducts");
      setLoading(false);
    }
  };

  const fetchBanners = async () => {
    try {
      const { data } = await api.get("banners");
      setBanners(data.data);
      setBannersError(false);
    } catch (error: any) {
      console.error("Error fetching banners:", error);
      setBanners([]);
      setBannersError(true);
    } finally {
      setBannersLoading(false);
    }
  };

  // ✅ REMPLACE le useEffect([]) — recharge à CHAQUE retour sur Home
  useFocusEffect(
    useCallback(() => {
      fetchProducts();
      fetchBanners();
    }, []),
  );

  // Lance l'animation dès que le chargement des bannières est terminé et qu'il n'y en a pas
  useEffect(() => {
    if (!bannersLoading && banners.length === 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -8,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [bannersLoading, banners.length]);

  const handleBannerPress = (link?: string) => {
    router.push((link || "/shop") as any);
  };

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <Header title="Forever" showMenu showCart showLogo />
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Banners */}
        {bannersLoading ? (
          <View className="mb-6 h-48 items-center justify-center">
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : banners.length > 0 ? (
          <View className="mb-6">
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              className="w-full h-48 rounded-xl"
              scrollEventThrottle={16}
              onScroll={(event) => {
                const slide = Math.round(
                  event.nativeEvent.contentOffset.x /
                    event.nativeEvent.layoutMeasurement.width,
                );
                if (slide !== activeBannerIndex) {
                  setActiveBannerIndex(slide);
                }
              }}
            >
              {banners.map((banner) => (
                <View
                  key={banner._id}
                  className="relative w-full h-48 bg-gray-200 overflow-hidden"
                  style={{ width: width - 32 }}
                >
                  <Image
                    source={{ uri: banner.image }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-black/40" />
                  <View className="absolute bottom-4 left-4 z-10">
                    <Text className="text-white text-2xl font-bold">
                      {banner.title}
                    </Text>
                    {banner.subtitle ? (
                      <Text className="text-white text-sm font-medium">
                        {banner.subtitle}
                      </Text>
                    ) : null}
                    <TouchableOpacity
                      className="mt-2 bg-white px-4 py-2 rounded-full self-start"
                      onPress={() => handleBannerPress(banner.link)}
                    >
                      <Text className="text-primary font-bold text-xs">
                        {t("shopNow")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View className="flex-row justify-center mt-3 gap-2">
              {banners.map((_, index) => (
                <View
                  key={index}
                  className={`h-2 rounded-full ${
                    index === activeBannerIndex
                      ? "w-6 bg-primary"
                      : "w-2 bg-gray-300"
                  }`}
                />
              ))}
            </View>
          </View>
        ) : (
          <Animated.View
            className="mb-6 h-48 rounded-2xl overflow-hidden items-center justify-center"
            style={{
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              backgroundColor: "#F8F6F3",
              borderWidth: 1,
              borderColor: "#EFEAE4",
              borderStyle: "dashed",
            }}
          >
            <Animated.View
              style={{
                transform: [{ translateY: floatAnim }],
              }}
              className="w-16 h-16 rounded-full items-center justify-center mb-3"
            >
              <View
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{ backgroundColor: "#EFEAE4" }}
              >
                <Ionicons name="images-outline" size={30} color={COLORS.primary} />
              </View>
            </Animated.View>
            <Text className="text-primary font-bold text-base">
              {t("noBannersYet") || "Aucune bannière pour le moment"}
            </Text>
            <Text className="text-secondary text-xs mt-1 text-center px-8">
              {t("noBannersSubtitle") || "Reviens bientôt pour découvrir nos offres"}
            </Text>
          </Animated.View>
        )}

        {/* Categories */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold mb-4">{t("categories")}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="w-full rounded-xl"
          >
            {categories.map((cat: any) => (
              <CategoryItem
                key={cat.id}
                item={cat}
                isSelected={false}
                onPress={() => {
                  if (cat.id === "all") {
                    router.push("/shop");
                  } else {
                    router.push({
                      pathname: "/category",
                      params: {
                        category: cat.nameKey,
                        categoryName: cat.nameKey,
                      },
                    });
                  }
                }}
              />
            ))}
          </ScrollView>
        </View>

        {/* Popular */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-primary">{t("popular")}</Text>
            <TouchableOpacity onPress={() => router.push("/shop")}>
              <Text className="text-secondary text-sm">{t("seeAll")}</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator size="large" />
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {products.slice(0, 4).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </View>
          )}
        </View>

        {/* Newsletter */}
        <View className="bg-gray-100 p-6 rounded-2xl mb-20 items-center">
          <Text className="text-2xl font-bold text-primary mb-2 text-center">
            {t("joinRevolution")}
          </Text>
          <Text className="text-secondary text-center mb-4">
            {t("newsletterSubtitle")}
          </Text>
          <TouchableOpacity className="bg-primary w-4/5 py-3 rounded-full items-center">
            <Text className="text-white font-medium text-base">
              {t("subscribeNow")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}