import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Product } from "@/constants/types";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";
import { COLORS } from "@/constants";
import { Ionicons } from "@expo/vector-icons";

export default function CategoryPage() {
  const { t } = useLanguage();
  const { category, categoryName } = useLocalSearchParams<{
    category: string;
    categoryName: string;
  }>();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchProducts = async (pageNumber = 1) => {
    if (pageNumber === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const { data } = await api.get("/products", {
        params: { page: pageNumber, limit: 10, category },
      });

      if (pageNumber === 1) {
        setProducts(data.data);
      } else {
        setProducts((prev) => [...prev, ...data.data]);
      }
      setHasMore(data.pagination.page < data.pagination.pages);
      setPage(pageNumber);
    } catch (error) {
      console.error("Error fetching category products:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && !loading && hasMore) {
      fetchProducts(page + 1);
    }
  };

  useEffect(() => {
    fetchProducts(1);
  }, [category]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header
        title={categoryName ? t(categoryName) : t("products")}
        showBack
        showCart
      />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          renderItem={({ item }) => <ProductCard product={item} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4">
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="cube-outline" size={48} color={COLORS.secondary} />
              <Text className="text-secondary mt-3">
                {t("noProductsFound")}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}