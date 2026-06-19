import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import React from "react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import CartItem from "@/components/CartItem";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext"; // ← AJOUT

export default function Cart() {
  const { cartItems, cartTotal, removeFromCart, updateCartItemQuantity } = useCart();
  const router = useRouter();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency(); // ← AJOUT

  const shipping = 2.0;
  const total = cartTotal + shipping;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={t("myCart")} showBack />
      {cartItems.length > 0 ? (
        <>
          <ScrollView
            className="flex-1 px-4 mt-4"
            showsVerticalScrollIndicator={false}
          >
            {cartItems.map((item, index) => (
              <CartItem
                key={index}
                item={item}
                onRemove={() => removeFromCart(item.productId, item.size)}
                onUpdateQuantity={(q) =>
                  updateCartItemQuantity(item.productId, q, item.size)
                }
              />
            ))}
          </ScrollView>

          <View className="p-4 bg-white rounded-t-3xl shadow-sm">
            {/* Subtotal */}
            <View className="flex-row justify-between mb-2">
              <Text className="text-secondary">{t("subtotal")}</Text>
              <Text className="text-primary font-bold">
                {formatPrice(cartTotal)} {/* ← MODIFIÉ */}
              </Text>
            </View>
            {/* Shipping */}
            <View className="flex-row justify-between mb-2">
              <Text className="text-secondary">{t("shipping")}</Text>
              <Text className="text-primary font-bold">
                {formatPrice(shipping)} {/* ← MODIFIÉ */}
              </Text>
            </View>
            {/* Border */}
            <View className="h-[1px] bg-border mb-4" />
            {/* Total */}
            <View className="flex-row justify-between mb-6">
              <Text className="text-primary font-bold text-lg">{t("total")}</Text>
              <Text className="text-primary font-bold text-lg">
                {formatPrice(total)} {/* ← MODIFIÉ */}
              </Text>
            </View>
            {/* Checkout button */}
            <TouchableOpacity
              className="bg-primary py-4 rounded-full items-center"
              onPress={() => router.push("/checkout")}
            >
              <Text className="text-white font-bold text-base">{t("checkout")}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text>{t("cartEmpty")}</Text>
          <TouchableOpacity onPress={() => router.push("/")} className="mt-4">
            <Text className="text-primary font-bold">{t("startShopping")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}