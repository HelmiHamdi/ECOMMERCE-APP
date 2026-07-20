import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Modal,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, CATEGORIES } from "@/constants";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import Toast from "react-native-toast-message";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_HORIZONTAL_MARGIN = 12;
const GALLERY_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_MARGIN * 2;
const GALLERY_HEIGHT = 260;

function ProductGallery({
  images,
  onImagePress,
}: {
  images: string[];
  onImagePress: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [failedUris, setFailedUris] = useState<Record<number, boolean>>({});

  const validImages = images && images.length > 0 ? images : [];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / GALLERY_WIDTH);
    if (newIndex !== index) setIndex(newIndex);
  };

  if (validImages.length === 0) {
    return (
      <View
        style={{ width: GALLERY_WIDTH, height: GALLERY_HEIGHT }}
        className="bg-gray-100 items-center justify-center"
      >
        <Ionicons name="image-outline" size={40} color="#C4C4C4" />
      </View>
    );
  }

  return (
    <View style={{ width: GALLERY_WIDTH, height: GALLERY_HEIGHT }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {validImages.map((uri, i) =>
          failedUris[i] ? (
            <View
              key={i}
              style={{ width: GALLERY_WIDTH, height: GALLERY_HEIGHT }}
              className="bg-gray-100 items-center justify-center"
            >
              <Ionicons name="image-outline" size={40} color="#C4C4C4" />
            </View>
          ) : (
            <TouchableOpacity
              key={i}
              activeOpacity={0.92}
              onPress={() => onImagePress(i)}
              style={{ width: GALLERY_WIDTH, height: GALLERY_HEIGHT }}
            >
              <Image
                source={{ uri }}
                style={{ width: GALLERY_WIDTH, height: GALLERY_HEIGHT }}
                resizeMode="cover"
                onError={() =>
                  setFailedUris((prev) => ({ ...prev, [i]: true }))
                }
              />
            </TouchableOpacity>
          ),
        )}
      </ScrollView>

      {validImages.length > 1 && (
        <View className="absolute bottom-3 right-3 bg-black/55 px-2.5 py-1 rounded-full">
          <Text className="text-white text-[11px] font-medium">
            {index + 1} / {validImages.length}
          </Text>
        </View>
      )}

      {/* Petit indice visuel discret pour signaler que l'image est tapable */}
      <View className="absolute top-3 left-3 bg-black/45 rounded-full p-1.5">
        <Ionicons name="expand-outline" size={14} color="#fff" />
      </View>
    </View>
  );
}

// -------- Visionneuse plein écran (tap sur une image de la galerie) --------
function FullScreenImageViewer({
  visible,
  images,
  startIndex,
  onClose,
}: {
  visible: boolean;
  images: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const scrollRef = React.useRef<ScrollView>(null);
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (visible) {
      setIndex(startIndex);
      // Se positionne directement sur l'image tapée, sans animation visible.
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          x: startIndex * SCREEN_WIDTH,
          animated: false,
        });
      });
    }
  }, [visible, startIndex]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (newIndex !== index) setIndex(newIndex);
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {images.map((uri, i) => (
            <View
              key={i}
              style={{
                width: SCREEN_WIDTH,
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                source={{ uri }}
                style={{ width: SCREEN_WIDTH, height: "100%" }}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          onPress={onClose}
          style={{
            position: "absolute",
            top: 48,
            right: 20,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>

        {images.length > 1 && (
          <View
            style={{
              position: "absolute",
              bottom: 40,
              alignSelf: "center",
              backgroundColor: "rgba(255,255,255,0.15)",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 14,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }}>
              {index + 1} / {images.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

function formatAddedAt(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

// -------- Carte produit grand format --------
function ProductCard({
  product,
  onEdit,
  onDelete,
  onCreateOffer,
  onImagePress,
  formatPrice,
  t,
}: {
  product: any;
  onEdit: () => void;
  onDelete: () => void;
  onCreateOffer: () => void;
  onImagePress: (images: string[], index: number) => void;
  formatPrice: (n: number) => string;
  t: (k: string) => string;
}) {
  const hasActiveOffer = !!product.hasActiveOffer && product.finalPrice != null;
  const images: string[] = Array.isArray(product.images)
    ? product.images
    : product.images
      ? [product.images]
      : [];
  const sizes: string[] = Array.isArray(product.sizes)
    ? product.sizes
    : typeof product.sizes === "string" && product.sizes.length > 0
      ? product.sizes.split(",").map((s: string) => s.trim())
      : [];

  return (
    <View
      className="bg-white rounded-2xl border border-gray-100 mb-4 overflow-hidden"
      style={{ marginHorizontal: CARD_HORIZONTAL_MARGIN }}
    >
      <View className="relative">
        <ProductGallery
          images={images}
          onImagePress={(i) => onImagePress(images, i)}
        />

        {hasActiveOffer && (
          <View
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "#EF4444" }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
              -{product.discountPercentage}%
            </Text>
          </View>
        )}

        {product.isFeatured && (
          <View className="absolute top-3 left-3 bg-black/60 px-2.5 py-1 rounded-full flex-row items-center">
            <Ionicons name="star" size={11} color="#FFD35A" />
            <Text className="text-white text-[11px] font-medium ml-1">
              {t("featuredProduct") ?? "Mis en avant"}
            </Text>
          </View>
        )}
      </View>

      <View className="p-4">
        <View className="flex-row justify-between items-start mb-2">
          <Text className="flex-1 text-lg font-semibold text-primary mr-2">
            {product.name}
          </Text>
          <View className="bg-slate-100 px-2.5 py-1 rounded-full">
            <Text className="text-[11px] font-semibold text-secondary">
              {t(product.category) || product.category || t("others")}
            </Text>
          </View>
        </View>
        <View className="mb-3">
          <StatusBadge status={product.status ?? "in_stock"} />
        </View>
        {hasActiveOffer ? (
          <View className="flex-row items-baseline mb-3" style={{ gap: 8 }}>
            <Text
              style={{
                fontSize: 13,
                color: "#9CA3AF",
                textDecorationLine: "line-through",
              }}
            >
              {formatPrice(product.price)}
            </Text>
            <Text className="text-primary font-bold text-xl">
              {formatPrice(product.finalPrice)}
            </Text>
          </View>
        ) : (
          <Text className="text-primary font-bold text-xl mb-3">
            {formatPrice(product.price)}
          </Text>
        )}

        <View className="flex-row items-center mb-3" style={{ gap: 16 }}>
          <View className="flex-row items-center">
            <Ionicons name="cube-outline" size={14} color="#6B7280" />
            <Text className="text-secondary text-xs ml-1.5">
              {product.stock} {t("stock") ?? "en stock"}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
            <Text className="text-[11px] ml-1.5" style={{ color: "#9CA3AF" }}>
              {formatAddedAt(product.createdAt)}
            </Text>
          </View>
        </View>

        {sizes.length > 0 && (
          <View className="flex-row flex-wrap mb-3" style={{ gap: 6 }}>
            {sizes.map((size, i) => (
              <View
                key={i}
                className="bg-surface border border-gray-200 rounded-lg px-2.5 py-1"
              >
                <Text className="text-xs font-medium text-primary">{size}</Text>
              </View>
            ))}
          </View>
        )}

        {!!product.description && (
          <Text className="text-secondary text-sm leading-5 mb-4">
            {product.description}
          </Text>
        )}

        <View className="flex-row" style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={onCreateOffer}
            className="flex-1 flex-row items-center justify-center bg-surface border border-gray-200 rounded-xl py-2.5"
          >
            <Ionicons
              name="pricetag-outline"
              size={16}
              color={COLORS.primary}
            />
            <Text className="text-primary text-xs font-semibold ml-1.5">
              {t("createOffer") ?? "Offre"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onEdit}
            className="flex-1 flex-row items-center justify-center bg-surface border border-gray-200 rounded-xl py-2.5"
          >
            <Ionicons name="create-outline" size={16} color="#333333" />
            <Text className="text-primary text-xs font-semibold ml-1.5">
              {t("edit") ?? "Modifier"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onDelete}
            className="flex-1 flex-row items-center justify-center bg-red-50 border border-red-100 rounded-xl py-2.5"
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text className="text-red-600 text-xs font-semibold ml-1.5">
              {t("delete") ?? "Supprimer"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function CategoryProducts() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // 👇 AJOUT — état de la visionneuse plein écran (image tapée dans une fiche)
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);

  const openImageViewer = (images: string[], index: number) => {
    setViewerImages(images);
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const categoryMeta = CATEGORIES.find((c) => c.nameKey === category);
  const categoryLabel = categoryMeta ? t(categoryMeta.nameKey) : category;

  const fetchProducts = async () => {
    try {
      const { data } = await api.get("/products", {
        params: { limit: 999 },
      });
      if (data.success) {
        const filtered = data.data.filter(
          (p: any) =>
            String(p.category || "").toLowerCase() ===
            String(category || "").toLowerCase(),
        );
        const sorted = filtered.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setProducts(sorted);
      }
    } catch (error: any) {
      console.error("Failed to fetch category products : ", error);
      Toast.show({
        type: "error",
        text1: t("failedToFetchProducts"),
        text2: error.response?.data?.message || t("somethingWentWrong"),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [category]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const performDelete = async (id: string) => {
    setDeleting(true);
    try {
      const token = await getToken();
      const { data } = await api.delete(`/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        Toast.show({
          type: "success",
          text1: t("success"),
          text2: t("productDeleted"),
        });
        fetchProducts();
      }
    } catch (error: any) {
      console.error("Failed to delete product :", error);
      Toast.show({
        type: "error",
        text1: t("failedToDeleteProduct"),
        text2: error.response?.data?.message || t("somethingWentWrong"),
      });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      performDelete(deleteTarget.id);
    }
  };

  const createOfferForProduct = (id: string) => {
    router.push(`/admin/offers/create?productId=${id}` as any);
  };

  if (loading && !refreshing) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title={categoryLabel} showBack />
        <View className="flex-1 justify-center items-center bg-surface">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title={categoryLabel} showBack />

      <View className="flex-1 bg-surface">
        <View className="px-4 py-3 bg-white border-b border-gray-100">
          <Text className="text-secondary text-sm">
            {products.length}{" "}
            {products.length > 1
              ? (t("productsInCategory") ?? "produits dans cette catégorie")
              : (t("productInCategory") ?? "produit dans cette catégorie")}
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {products.length === 0 ? (
            <View className="flex-1 justify-center items-center mt-20">
              <Ionicons name="cube-outline" size={40} color="#D1D5DB" />
              <Text className="text-secondary mt-3">
                {t("noProductsInCategory") ??
                  "Aucun produit dans cette catégorie"}
              </Text>
            </View>
          ) : (
            products.map((product: any) => (
              <ProductCard
                key={product._id}
                product={product}
                formatPrice={formatPrice}
                t={t}
                onEdit={() =>
                  router.push(`/admin/products/edit/${product._id}`)
                }
                onDelete={() =>
                  setDeleteTarget({ id: product._id, name: product.name })
                }
                onCreateOffer={() => createOfferForProduct(product._id)}
                onImagePress={openImageViewer}
              />
            ))
          )}
        </ScrollView>

        <FullScreenImageViewer
          visible={viewerVisible}
          images={viewerImages}
          startIndex={viewerIndex}
          onClose={() => setViewerVisible(false)}
        />

        <ConfirmDeleteModal
          visible={!!deleteTarget}
          title={t("deleteProductTitle")}
          message={t("deleteProductConfirm")}
          itemName={deleteTarget?.name}
          cancelText={t("cancel")}
          confirmText={t("delete")}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          loading={deleting}
        />
      </View>
    </>
  );
}
