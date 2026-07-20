import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, CATEGORIES } from "@/constants";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import Toast from "react-native-toast-message";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import StatusBadge from "@/components/StatusBadge";
import { PRODUCT_STATUS_LIST, ProductStatusKey } from "@/constants";
const THUMBNAIL_MAX_RETRIES = 2;

function ProductThumbnail({ uri }: { uri?: string }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);


  useEffect(() => {
    setAttempt(0);
    setFailed(false);
  }, [uri]);

  const handleError = () => {
    if (attempt < THUMBNAIL_MAX_RETRIES) {
     
      setTimeout(() => setAttempt((a) => a + 1), 500 * (attempt + 1));
    } else {
      setFailed(true);
    }
  };

  const retryManually = () => {
    setAttempt(0);
    setFailed(false);
  };

  const showFallback = !uri || failed;

  // 👇 CORRIGÉ — "h-full" (height: '100%') dans une ScrollView provoquait un calcul
  // de pourcentage sur une hauteur de parent indéfinie, ce qui faisait exploser la taille.
  // On utilise "flex: 1" à la place : l'image s'étire exactement à la hauteur du bloc
  // de texte voisin (grâce à "items-stretch" sur la ligne parente), sans dépasser.
  return (
    <View
      className="w-28 rounded-lg bg-gray-100 items-center justify-center overflow-hidden"
      style={{ flex: 1 }}
    >
      {showFallback ? (
        <TouchableOpacity onPress={retryManually} disabled={!uri}>
          <Ionicons name="image-outline" size={22} color="#9CA3AF" />
        </TouchableOpacity>
      ) : (
        <Image
          key={attempt}
          source={{ uri }}
          className="rounded-lg"
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          onError={handleError}
        />
      )}
    </View>
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
    second: "2-digit",
  });
  return `${date} · ${time}`;
}

function CategoryChip({
  label,
  count,
  icon,
  active,
  onPress,
}: {
  label: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="flex-row items-center rounded-full mr-2"
      style={{
        height: 36,
        paddingHorizontal: 14,
        backgroundColor: active ? COLORS.primary : "#F3F4F6",
      }}
    >
      <Ionicons name={icon} size={14} color={active ? "#fff" : "#6B7280"} />
      <Text
        className="text-[13px] font-semibold ml-1.5"
        style={{ color: active ? "#fff" : "#6B7280" }}
      >
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );
}

export default function AdminProducts() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { category: categoryParam } = useLocalSearchParams<{
    category?: string;
  }>();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [deleting, setDeleting] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string | "all">(
    categoryParam || "all",
  );
const [selectedStatus, setSelectedStatus] = useState<ProductStatusKey | "all">("all");
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get("/products", {
        params: { limit: 999 },
      });
      if (data.success) {
        const sorted = [...data.data].sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setProducts(sorted);
      }
    } catch (error: any) {
      console.error("Failed to fetch products : ", error);
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
  }, []);

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

  const deleteProduct = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      performDelete(deleteTarget.id);
    }
  };

  const createOfferForProduct = (id: string) => {
    router.push(`/admin/offers/create?productId=${id}` as any);
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p: any) => {
      const key = String(p.category || "other").toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [products]);
const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p: any) => {
      const key = p.status ?? "in_stock";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [products]);
 const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategory !== "all") {
      result = result.filter(
        (p: any) => String(p.category || "").toLowerCase() === selectedCategory
      );
    }
    if (selectedStatus !== "all") {
      result = result.filter((p: any) => (p.status ?? "in_stock") === selectedStatus);
    }
    return result;
  }, [products, selectedCategory, selectedStatus]);

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <View className="p-4 bg-white border border-gray-100 flex-row justify-between items-center">
        <Text className="text-lg font-semibold text-primary">
          {t("totalProducts")} ({products.length})
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/admin/products/add")}
          className="bg-gray-800 px-4 py-2 rounded-full flex-row items-center"
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="text-white font-medium ml-1">{t("addProduct")}</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-white border-b border-gray-100">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            alignItems: "center",
          }}
        >
          <CategoryChip
            label={t("all") ?? "Tout"}
            count={products.length}
            icon="apps-outline"
            active={selectedCategory === "all"}
            onPress={() => setSelectedCategory("all")}
          />

          {CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat.id}
              label={t(cat.nameKey)}
              count={categoryCounts[cat.nameKey] || 0}
              icon={cat.icon as any}
              active={selectedCategory === cat.nameKey}
              onPress={() => setSelectedCategory(cat.nameKey)}
            />
          ))}
        </ScrollView>
      </View>
{/* ------- Filtres par statut ------- */}
      <View className="bg-white border-b border-gray-100">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            alignItems: "center",
          }}
        >
          <CategoryChip
            label={t("all") ?? "Tout"}
            count={products.length}
            icon="layers-outline"
            active={selectedStatus === "all"}
            onPress={() => setSelectedStatus("all")}
          />
          {PRODUCT_STATUS_LIST.map((s) => (
            <CategoryChip
              key={s.key}
              label={t(s.labelKey) ?? s.defaultLabel}
              count={statusCounts[s.key] || 0}
              icon={s.icon as any}
              active={selectedStatus === s.key}
              onPress={() => setSelectedStatus(s.key as ProductStatusKey)}
            />
          ))}
        </ScrollView>
      </View>
      <ScrollView
        className="flex-1 p-2"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredProducts.length === 0 ? (
          <View className="flex-1 justify-center items-center mt-20">
            <Ionicons name="cube-outline" size={40} color="#D1D5DB" />
            <Text className="text-secondary mt-3">
              {selectedCategory === "all"
                ? t("noProductsFound")
                : (t("noProductsInCategory") ??
                  "Aucun produit dans cette catégorie")}
            </Text>
          </View>
        ) : (
          filteredProducts.map((product: any) => {
            const hasActiveOffer =
              !!product.hasActiveOffer && product.finalPrice != null;

            return (
              // 👇 MODIFIÉ — items-center remplacé par items-stretch pour que l'image
              // s'étire sur toute la hauteur de la ligne (même hauteur que le texte)
              <View
                key={product._id}
                className="bg-white p-3 rounded-lg border border-gray-100 mb-3 flex-row items-stretch"
              >
                <View className="relative mr-3" style={{ alignSelf: "stretch" }}>
                  <ProductThumbnail uri={product.images?.[0]} />
                  {hasActiveOffer && (
                    <View
                      className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: "#EF4444" }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 9,
                          fontWeight: "800",
                        }}
                      >
                        -{product.discountPercentage}%
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-1">
                  <Text
                    className="font-bold text-primary text-base"
                    numberOfLines={1}
                  >
                    {product.name}
                  </Text>
                  <Text
                    className="text-secondary text-xs mb-1"
                    numberOfLines={1}
                  >
                    {t("category")} : {product.category || t("others")}
                  </Text>
                  <Text
                    className="text-secondary text-xs mb-1"
                    numberOfLines={1}
                  >
                    {t("stock")} : {product.stock}
                  </Text>
                  <Text
                    className="text-secondary text-xs mb-1"
                    numberOfLines={1}
                  >
                    {t("sizes")} : {product.sizes.join(", ")}
                  </Text>
                  <View className="mb-1">
                    <StatusBadge
                      status={product.status ?? "in_stock"}
                      size="sm"
                    />
                  </View>
                  {hasActiveOffer ? (
                    <View
                      className="flex-row items-center mb-1"
                      style={{ gap: 6 }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#9CA3AF",
                          textDecorationLine: "line-through",
                        }}
                      >
                        {formatPrice(product.price)}
                      </Text>
                      <Text className="text-primary font-bold">
                        {formatPrice(product.finalPrice)}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-primary font-bold mb-1">
                      {formatPrice(product.price)}
                    </Text>
                  )}

                  {/* ------- Date/heure d'ajout ------- */}
                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={11} color="#9CA3AF" />
                    <Text
                      className="text-[10px] ml-1"
                      style={{ color: "#9CA3AF" }}
                    >
                      {formatAddedAt(product.createdAt)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={() => createOfferForProduct(product._id)}
                    className="p-2 bg-slate-50 rounded-full mr-2"
                  >
                    <Ionicons
                      name="pricetag-outline"
                      size={18}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      router.push(`/admin/products/edit/${product._id}`)
                    }
                    className="p-2 bg-slate-50 rounded-full mr-2"
                  >
                    <Ionicons name="create-outline" size={18} color="#333333" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteProduct(product._id, product.name)}
                    className="p-2 bg-gray-50 rounded-full"
                  >
                    <Ionicons name="trash-outline" size={18} color="#333333" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

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
  );
}