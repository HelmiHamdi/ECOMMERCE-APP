import { View, Text, TouchableOpacity, Image } from "react-native";
import React from "react";
import { HeaderProps } from "@/constants/types";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import { COLORS } from "@/constants";
import { useRouter } from "expo-router";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";

export default function Header({
  title,
  showBack,
  showSearch,
  showMenu,
  showLogo,
  showCart,
  rightAction, // ← AJOUT
}: HeaderProps) {
  const router = useRouter();
  const { itemCount } = useCart();
  const { t } = useLanguage();

  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-white">
      {/* Gauche */}
      <View className="flex-row items-center flex-1">
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {showMenu && (
          <TouchableOpacity className="mr-3">
            <Ionicons name="menu-outline" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {showLogo ? (
          <View className="flex-1">
            <Image
              source={require("@/assets/logo.png")}
              style={{ width: "100%", height: 24 }}
              resizeMode="contain"
            />
          </View>
        ) : title ? (
          <Text className="text-xl font-bold text-primary flex-1 text-center">
            {title}
          </Text>
        ) : null}
      </View>

      {/* Droite */}
      <View className="flex-row items-center gap-4">
        {showSearch && (
          <TouchableOpacity accessibilityLabel={t("search")}>
            <Ionicons name="search-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        )}
        {showCart && (
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/cart")}
            accessibilityLabel={t("cart")}
          >
            <View className="relative">
              <Ionicons name="bag-outline" size={24} color={COLORS.primary} />
              <View
                style={{ width: 16, height: 16, borderRadius: 8 }}
                className="absolute -top-1 -right-1 bg-accent rounded-full items-center justify-center"
              >
                <Text className="text-white text-[10px] font-bold">
                  {itemCount}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        {rightAction /* ← AJOUT */}
      </View>
    </View>
  );
}