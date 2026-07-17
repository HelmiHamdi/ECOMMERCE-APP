import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { COLORS } from "@/constants";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import Toast from "react-native-toast-message";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

export default function AdminProducts() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [deleting, setDeleting] = useState(false);

  // ← état pour la popup custom
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
        setProducts(data.data);
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

  // ← ouvre juste la popup custom
  const deleteProduct = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      performDelete(deleteTarget.id);
    }
  };

  // 👇 AJOUT — ouvre l'écran de création d'offre avec ce produit pré-sélectionné
  const createOfferForProduct = (id: string) => {
    router.push(`/admin/offers/create?productId=${id}` as any);
  };

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

      <ScrollView
        className="flex-1 p-2"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {products.length === 0 ? (
          <View className="flex-1 justify-center items-center mt-20">
            <Text className="text-secondary">{t("noProductsFound")}</Text>
          </View>
        ) : (
          products.map((product: any) => {
            // 👇 AJOUT — vient de attachActiveOffers côté backend (getProducts)
            const hasActiveOffer = !!product.hasActiveOffer && product.finalPrice != null;

            return (
              <View
                key={product._id}
                className="bg-white p-3 rounded-lg border border-gray-100 mb-3 flex-row items-center"
              >
                <View className="relative mr-3">
                  <Image
                    source={{
                      uri:
                        product.images && product.images.length > 0
                          ? product.images[0]
                          : "https://via.placeholder.com/150",
                    }}
                    className="w-16 h-16 rounded-lg bg-gray-100"
                    resizeMode="cover"
                  />
                  {/* 👇 AJOUT — badge -X% si offre active */}
                  {hasActiveOffer && (
                    <View
                      className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: "#EF4444" }}
                    >
                      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>
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
                  <Text className="text-secondary text-xs mb-1" numberOfLines={1}>
                    {t("category")} : {product.category || t("others")}
                  </Text>
                  <Text className="text-secondary text-xs mb-1" numberOfLines={1}>
                    {t("stock")} : {product.stock}
                  </Text>
                  <Text className="text-secondary text-xs mb-1" numberOfLines={1}>
                    {t("sizes")} : {product.sizes.join(", ")}
                  </Text>

                  {/* 👇 CORRECTION — affiche le prix promo si l'offre est active */}
                  {hasActiveOffer ? (
                    <View className="flex-row items-center" style={{ gap: 6 }}>
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
                    <Text className="text-primary font-bold">
                      {formatPrice(product.price)}
                    </Text>
                  )}
                </View>

                <View className="flex-row items-center">
                  {/* 👇 AJOUT — bouton "créer une offre" pour ce produit */}
                  <TouchableOpacity
                    onPress={() => createOfferForProduct(product._id)}
                    className="p-2 bg-slate-50 rounded-full mr-2"
                  >
                    <Ionicons name="pricetag-outline" size={18} color={COLORS.primary} />
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

      {/* ← Popup de confirmation custom */}
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