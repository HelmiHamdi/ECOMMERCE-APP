// app/checkout.tsx — version complète avec Stripe
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import React, { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "expo-router";
import { Address } from "@/constants/types";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@/constants";
import Header from "@/components/Header";
import { ScrollView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";
import { useStripePayment } from "./hooks/useStripePayment";


export default function Checkout() {
  const { getToken } = useAuth();
  const { cartTotal, clearCart } = useCart();
  const router = useRouter();
  const { t } = useLanguage();
  const { initializePayment, presentPayment } = useStripePayment();

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "stripe">("cash");

  const shipping = 2.0;
  const tax = 0;
  const total = cartTotal + shipping + tax;

  const fetchAddress = async () => {
    try {
      const token = await getToken();
      const { data } = await api.get("/addresses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const addrList = data.data;
      if (addrList.length > 0) {
        const def = addrList.find((a: Address) => a.isDefault) || addrList[0];
        setSelectedAddress(def);
      }
    } catch (error) {
      Toast.show({ type: "error", text1: t("error"), text2: t("failedToLoadCheckoutInfo") });
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { fetchAddress(); }, []);

  // ─── Paiement Cash ────────────────────────────────────────────────────────
  const handleCashOrder = async () => {
    const token = await getToken();
    const { data } = await api.post(
      "/orders",
      { shippingAddress: selectedAddress, notes: "Placed via App", paymentMethod: "cash" },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (data.success) {
      await clearCart();
      Toast.show({ type: "success", text1: t("orderPlaced"), text2: t("orderPlacedSuccess") });
      router.replace("/orders");
    }
  };

  // ─── Paiement Stripe ──────────────────────────────────────────────────────
  const handleStripeOrder = async () => {
    // Étape 1 : créer le PaymentIntent
    const { paymentIntentId } = await initializePayment();

    // Étape 2 : ouvrir la feuille de paiement Stripe
    const result = await presentPayment();
    if (result.canceled) return; // user a annulé

    // Étape 3 : créer la commande avec paymentIntentId confirmé
    const token = await getToken();
    const { data } = await api.post(
      "/orders",
      {
        shippingAddress: selectedAddress,
        notes: "Placed via App",
        paymentMethod: "stripe",
        paymentIntentId,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (data.success) {
      await clearCart();
      Toast.show({ type: "success", text1: t("orderPlaced"), text2: t("orderPlacedSuccess") });
      router.replace("/orders");
    }
  };

  // ─── Handler principal ────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      return Toast.show({ type: "error", text1: t("error"), text2: t("pleaseAddShippingAddress") });
    }
    setLoading(true);
    try {
      if (paymentMethod === "stripe") {
        await handleStripeOrder();
      } else {
        await handleCashOrder();
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("failedToPlaceOrder"),
        text2: error.response?.data?.message || error.message || t("somethingWentWrong"),
      });
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={t("checkout")} showBack />
      <ScrollView className="flex-1 px-4 mt-4">
        {/* Adresse */}
        <Text className="text-lg font-bold text-primary mb-4">{t("shippingAddressTitle")}</Text>
        {selectedAddress ? (
          <View className="bg-white p-4 rounded-xl mb-6 shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-bold">{selectedAddress.type}</Text>
              <TouchableOpacity onPress={() => router.push("/addresses")}>
                <Text className="text-accent text-sm">{t("change")}</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-secondary leading-5">
              {selectedAddress.street}, {selectedAddress.city}{"\n"}
              {selectedAddress.state} {selectedAddress.zipCode}{"\n"}
              {selectedAddress.country}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push("/addresses")}
            className="bg-white p-6 rounded-xl mb-6 items-center justify-center border-dashed border-2 border-gray-100"
          >
            <Text className="text-primary font-bold">{t("addAddress")}</Text>
          </TouchableOpacity>
        )}

        {/* Méthode de paiement */}
        <Text className="text-lg font-bold text-primary mb-4">{t("paymentMethod")}</Text>

        {/* Cash */}
        <TouchableOpacity
          onPress={() => setPaymentMethod("cash")}
          className={`bg-white p-4 rounded-xl mb-4 shadow-sm flex-row items-center border-2 ${paymentMethod === "cash" ? "border-primary" : "border-transparent"}`}
        >
          <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-primary">{t("paymentMethodCod")}</Text>
            <Text className="text-secondary text-xs mt-1">{t("payWhenReceive")}</Text>
          </View>
          {paymentMethod === "cash" && (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
          )}
        </TouchableOpacity>

        {/* Carte Stripe */}
        <TouchableOpacity
          onPress={() => setPaymentMethod("stripe")}
          className={`bg-white p-4 rounded-xl mb-4 shadow-sm flex-row items-center border-2 ${paymentMethod === "stripe" ? "border-primary" : "border-transparent"}`}
        >
          <Ionicons name="card-outline" size={24} color={COLORS.primary} />
          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-primary">{t("payWithCard")}</Text>
            <Text className="text-secondary text-xs mt-1">{t("creditOrDebitCard")}</Text>
            {/* Badge cartes acceptées */}
            <View className="flex-row mt-2 gap-1">
              {["VISA", "MC", "AMEX"].map((brand) => (
                <View key={brand} className="bg-gray-100 px-2 py-0.5 rounded">
                  <Text className="text-xs font-bold text-gray-600">{brand}</Text>
                </View>
              ))}
            </View>
          </View>
          {paymentMethod === "stripe" && (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Résumé commande */}
      <View className="p-4 pb-14 bg-white shadow-lg border-t border-gray-100">
        <Text className="text-lg font-bold text-primary mb-4">{t("orderSummary")}</Text>
        <View className="flex-row justify-between mb-2">
          <Text className="text-secondary">{t("subtotal")}</Text>
          <Text className="font-bold">${cartTotal.toFixed(2)}</Text>
        </View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-secondary">{t("shippingLabel")}</Text>
          <Text className="font-bold">${shipping.toFixed(2)}</Text>
        </View>
        <View className="flex-row justify-between mb-4">
          <Text className="text-secondary">{t("tax")}</Text>
          <Text className="font-bold">${tax.toFixed(2)}</Text>
        </View>
        <View className="flex-row justify-between mb-6">
          <Text className="text-primary text-xl font-bold">{t("total")}</Text>
          <Text className="text-primary text-xl font-bold">${total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          className={`p-4 rounded-xl items-center ${loading ? "bg-gray-400" : "bg-primary"}`}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">
              {paymentMethod === "stripe" ? `💳 ${t("payNow")} $${total.toFixed(2)}` : t("placeOrder")}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}