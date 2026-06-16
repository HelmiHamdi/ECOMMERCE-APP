import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { useWishlist } from "@/context/WishlistContext";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import { ScrollView } from "react-native-gesture-handler";
import ProductCard from "@/components/ProductCard";
import { useLanguage } from "@/context/LanguageContext";

export default function Favorite() {
  const { wishlist } = useWishlist();
  const router = useRouter();
  const { t } = useLanguage();
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={t("wishlist")} showMenu showCart />
      {wishlist.length > 0 ? (
        <ScrollView className="flex-1 px-4 mt-4"
        showsVerticalScrollIndicator={false}
        >
          <View className="flex-row flex-wrap justify-between">
            {wishlist.map((product)=>(
              <ProductCard key={product._id} product={product}/>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text>{t("wishlistEmpty")}</Text>
          <TouchableOpacity onPress={() => router.push("/")} className="mt-4">
            <Text className="text-primary font-bold">{t("startShopping")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}