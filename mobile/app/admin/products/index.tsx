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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import Toast from "react-native-toast-message";
import { useLanguage } from "@/context/LanguageContext";

export default function AdminProducts() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);

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
    }finally{
        setLoading(false)
        setRefreshing(false)
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
    try {
        const token = await getToken();
         const {data } = await api.delete(`/products/${id}`,{headers:{
                Authorization: `Bearer ${token}`},})
          if(data.success){
                Toast.show({
                type: 'success',
                text1: t("success"),
                text2: t("productDeleted")
            })
         fetchProducts();
        }
    } catch (error: any) {
         console.error("Failed to delete product :",error)
           Toast.show({
                type: 'error',
                text1: t("failedToDeleteProduct"),
                text2: error.response?.data?.message || t("somethingWentWrong")
            })
    }
  };

  const deleteProduct = async (id: string) => {
    Alert.alert(
      t("deleteProductTitle"),
      t("deleteProductConfirm"),
      [
        { text: t("cancel"), style: "cancel" as const },
        {
          text: t("delete"),
          style: "destructive" as const,
          onPress: () => performDelete(id),
        },
      ],
    );
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
          products.map((product: any) => (
            <View
              key={product._id}
              className="bg-white p-3 rounded-lg border border-gray-100 mb-3 flex-row items-center"
            >
              <Image
                source={{
                  uri:
                    product.images && product.images.length > 0
                      ? product.images[0]
                      : "https://via.placeholder.com/150",
                }}
                className="w-16 h-16 rounded-lg bg-gray-100 mr-3"
                resizeMode="cover"
              />

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
                <Text className="text-primary font-bold">
                  ${product.price.toFixed(2)}
                </Text>
              </View>

              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/admin/products/edit/${product._id}`)
                  }
                  className="p-2 bg-slate-50 rounded-full mr-2"
                >
                  <Ionicons name="create-outline" size={18} color="#333333" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deleteProduct(product._id)}
                  className="p-2 bg-gray-50 rounded-full"
                >
                  <Ionicons name="trash-outline" size={18} color="#333333" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}