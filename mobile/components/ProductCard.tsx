import { View, Text, TouchableOpacity, Image } from "react-native";
import React from "react";
import { Link } from "expo-router";
import { ProductCardProps } from "@/constants/types";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";
import { useWishlist } from "@/context/WishlistContext";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext"; 
import StatusBadge from "@/components/StatusBadge";
import { PRODUCT_STATUSES } from "@/constants";

export default function ProductCard({ product }: ProductCardProps) {
  const {toggleWishlist,isInWishlist} = useWishlist();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency(); 
  const isLiked = isInWishlist(product._id); 

  // 👇 AJOUT — l'offre active vient du backend (attachActiveOffers dans productController)
  const hasActiveOffer = !!product.hasActiveOffer && product.finalPrice != null;

  return (
    <Link href={`/product/${product._id}`} asChild>
      <TouchableOpacity className="w-[48%] mb-4 rounded-lg overflow-hidden bg-white ">
        <View className="relative w-full h-60 bg-gray-100">
          <Image
            source={{ uri: product.images?.[0] ?? '' }}
            className="w-full h-full"
            resizeMode="cover"
          />
          <TouchableOpacity
            className="absolute top-2 right-2 p-2 z-10 bg-white rounded-full 
            shadow-sm"
            onPress={(e) => {
              e.stopPropagation();
              toggleWishlist(product);
            }}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={20}
              color={isLiked ? COLORS.accent : COLORS.primary}
            />
          </TouchableOpacity>
          {product.isFeatured && (
            <View className="absolute top-2 left-2 px-2 py-1 bg-black rounded">
              <Text className="text-white text-xs font-bold uppercase">
                {t("featured")}
              </Text>
            </View>
          )}
          {/* 👇 AJOUT — badge -X% en overlay si offre active, décalé si "featured" est déjà présent */}
          {hasActiveOffer && (
            <View
              className={`absolute left-2 px-2 py-1 rounded ${product.isFeatured ? "top-9" : "top-2"}`}
              style={{ backgroundColor: "#EF4444" }}
            >
              <Text className="text-white text-xs font-bold">
                -{product.discountPercentage}%
              </Text>
            </View>
          )}

          {/* 👇 SUPPRIMÉ — le StatusBadge n'est plus affiché en overlay sur l'image */}

          {/* 👇 AJOUT — overlay grisé si le produit est épuisé, pour bien le signaler visuellement */}
          {product.status === "out_of_stock" && (
            <View
              className="absolute inset-0 items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.55)" }}
              pointerEvents="none"
            />
          )}
        </View>
        <View className="p-3">
          {/* 👇 MODIFIÉ — le StatusBadge est maintenant sur la même ligne que l'étoile, aligné à droite */}
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center">
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text className="text-xs text-secondary ml-1">4.6</Text>
            </View>
            <StatusBadge status={product.status ?? "in_stock"} size="sm" />
          </View>

          <Text
            className="text-primary text-sm font-medium mb-1"
            numberOfLines={1}
          >
            {product.name}
          </Text>

          {/* 👇 CORRECTION — affiche le prix promo si l'offre est active */}
          {hasActiveOffer ? (
            <View className="flex-row items-center flex-wrap" style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: "#9CA3AF",
                  textDecorationLine: "line-through",
                }}
              >
                {formatPrice(product.price)}
              </Text>
              <Text className="text-primary text-base font-bold">
                {formatPrice(product.finalPrice!)}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center">
              <Text className="text-primary text-base font-bold">
                {formatPrice(product.price)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Link>
  );
}