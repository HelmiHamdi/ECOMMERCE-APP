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
  StyleSheet,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
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
import { useVideoPlayer, VideoView } from "expo-video"; // ← AJOUT VIDEO

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

  // ───── AJOUT VIDEO : état du player ─────
  const player = useVideoPlayer(product?.video ?? null, (p) => {
    p.loop = false;
  });
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoPosition, setVideoPosition] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showVideoControls, setShowVideoControls] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ───── AJOUT VIDEO : écoute des changements de statut du player ─────
  useEffect(() => {
    if (!product?.video) return;

    const playingSub = player.addListener("playingChange", (e) => {
      setVideoPlaying(e.isPlaying);
    });
    const statusSub = player.addListener("statusChange", (e) => {
      if (e.status === "readyToPlay") {
        setVideoLoading(false);
        setVideoDuration(player.duration * 1000);
      }
    });

    const interval = setInterval(() => {
      setVideoPosition(player.currentTime * 1000);
    }, 250);

    return () => {
      playingSub.remove();
      statusSub.remove();
      clearInterval(interval);
    };
  }, [player, product?.video]);

  // ───── AJOUT VIDEO : helpers ─────
  const resetControlsTimer = () => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    setShowVideoControls(true);
    controlsTimer.current = setTimeout(() => {
      if (videoPlaying) setShowVideoControls(false);
    }, 3000);
  };

  const togglePlayPause = () => {
    resetControlsTimer();
    if (videoPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const progressPercent =
    videoDuration > 0 ? (videoPosition / videoDuration) * 100 : 0;

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

          {/* ───── AJOUT VIDEO : section vidéo, ne s'affiche que si product.video existe ───── */}
          {product.video && (
            <View style={{ marginBottom: 32 }}>
              {/* Section Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 14,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: COLORS.primary + "15",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="videocam" size={18} color={COLORS.primary} />
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: COLORS.primary,
                    }}
                  >
                    {t("productVideo") || "Vidéo du produit"}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
                    {t("watchInAction") || "Voir le produit en action"}
                  </Text>
                </View>
              </View>

              {/* Video Player Card */}
              <View
                style={{
                  borderRadius: 20,
                  overflow: "hidden",
                  backgroundColor: "#0F0F0F",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.18,
                  shadowRadius: 16,
                  elevation: 10,
                }}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => {
                    resetControlsTimer();
                    setShowVideoControls((v) => !v);
                  }}
                  style={{ position: "relative" }}
                >
                  <VideoView
                    player={player}
                    style={{ width: "100%", aspectRatio: 16 / 9 }}
                    contentFit="contain"
                    nativeControls={false}
                  />

                  {/* Loading Spinner */}
                  {videoLoading && (
                    <View
                      style={{
                        ...StyleSheet.absoluteFillObject,
                        backgroundColor: "rgba(0,0,0,0.4)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ActivityIndicator size="large" color="#fff" />
                    </View>
                  )}

                  {/* Controls Overlay */}
                  {showVideoControls && !videoLoading && (
                    <View
                      style={{
                        ...StyleSheet.absoluteFillObject,
                        backgroundColor: "rgba(0,0,0,0.25)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <TouchableOpacity
                        onPress={togglePlayPause}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 32,
                          backgroundColor: "rgba(255,255,255,0.95)",
                          alignItems: "center",
                          justifyContent: "center",
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 8,
                        }}
                      >
                        <Ionicons
                          name={videoPlaying ? "pause" : "play"}
                          size={28}
                          color={COLORS.primary}
                          style={{ marginLeft: videoPlaying ? 0 : 3 }}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Progress Bar + Time */}
                <View
                  style={{
                    backgroundColor: "#1A1A1A",
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <View
                    style={{
                      height: 3,
                      backgroundColor: "rgba(255,255,255,0.15)",
                      borderRadius: 2,
                      marginBottom: 8,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${progressPercent}%`,
                        backgroundColor: COLORS.primary,
                        borderRadius: 2,
                      }}
                    />
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
                      {formatDuration(videoPosition)}
                      <Text style={{ color: "rgba(255,255,255,0.3)" }}>
                        {" "}
                        / {formatDuration(videoDuration)}
                      </Text>
                    </Text>

                    <TouchableOpacity
                      onPress={togglePlayPause}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name={videoPlaying ? "pause-circle" : "play-circle"}
                        size={22}
                        color="rgba(255,255,255,0.85)"
                      />
                      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                        {videoPlaying
                          ? t("pause") || "Pause"
                          : t("play") || "Lire"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
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