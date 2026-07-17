import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import React from "react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import CartItem from "@/components/CartItem";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";

export default function Cart() {
  const {
    cartItems,
    cartTotal,
    removeFromCart,
    removeOfferFromCart, // 👈 AJOUT
    updateCartItemQuantity,
    updateOfferCartItemQuantity, // 👈 AJOUT
  } = useCart();
  const router = useRouter();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();

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
            {cartItems.map((item, index) => {
              // 👇 CORRECTION — un item "offre libre" n'a pas de produit :
              // il faut passer par les routes /cart/offer-item/:offerId,
              // pas /cart/item/:productId (qui plante si productId est null)
              const isFreeOffer = !item.product && !!item.offerId;

              return (
                <View key={index}>
                  <CartItem
                    item={item}
                    onRemove={() =>
                      isFreeOffer
                        ? removeOfferFromCart(item.offerId as string)
                        : removeFromCart(item.productId as string, item.size)
                    }
                    onUpdateQuantity={(q) =>
                      isFreeOffer
                        ? updateOfferCartItemQuantity(item.offerId as string, q)
                        : updateCartItemQuantity(item.productId as string, q, item.size)
                    }
                  />
                  {item.offerId && (
                    <View
                      className="flex-row items-center self-start mb-3 px-2 py-1 rounded-lg"
                      style={{ backgroundColor: `${COLORS.primary}12` }}
                    >
                      <Ionicons name="pricetag" size={11} color={COLORS.primary} />
                      <Text
                        className="ml-1 font-bold text-[10px]"
                        style={{ color: COLORS.primary }}
                      >
                        {t("offerApplied") || "Offre appliquée"}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View className="p-4 bg-white rounded-t-3xl shadow-sm">
            <View className="flex-row justify-between mb-2">
              <Text className="text-secondary">{t("subtotal")}</Text>
              <Text className="text-primary font-bold">
                {formatPrice(cartTotal)}
              </Text>
            </View>

            <View className="flex-row justify-between mb-2">
              <Text className="text-secondary">{t("shipping")}</Text>
              <Text className="text-primary font-bold">
                {formatPrice(shipping)}
              </Text>
            </View>

            <View className="h-[1px] bg-border mb-4" />

            <View className="flex-row justify-between mb-6">
              <Text className="text-primary font-bold text-lg">{t("total")}</Text>
              <Text className="text-primary font-bold text-lg">
                {formatPrice(total)}
              </Text>
            </View>

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