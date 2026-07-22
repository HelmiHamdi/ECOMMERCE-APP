import { View, Text, Image, TouchableOpacity } from "react-native";
import React from "react";
import { CartItemProps } from "@/constants/types";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";

export default function CartItem({
  item,
  onRemove,
  onUpdateQuantity,
}: CartItemProps) {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();


  const isFreeOffer = !item.product && !!item.offerId;
  const imageUrl = isFreeOffer ? item.offerImage : item.product?.images?.[0];
  const displayName = isFreeOffer ? item.offerTitle : item.product?.name;

  return (
    <View className="flex-row mb-4 bg-white p-3 rounded-xl overflow-hidden mr-3">
      <View className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden mr-3">
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Ionicons name="pricetag-outline" size={22} color={COLORS.secondary} />
          </View>
        )}
      </View>
      <View className="flex-1 justify-between">
       
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-2">
            <Text className="text-primary font-medium text-sm mb-1" numberOfLines={1}>
              {displayName}
            </Text>
           
            {!isFreeOffer && item.size ? (
              <Text className="text-secondary text-xs">
                {t("sizeLabel")}: {item.size}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={onRemove}>
            <Ionicons name="close-circle-outline" size={20} color="#FF4C3B" />
          </TouchableOpacity>
        </View>
        
        <View className="flex-row justify-between items-center mt-2">
       
          <Text className="text-primary font-bold text-base">
            {formatPrice(item.price)}
          </Text>
          <View className="flex-row items-center bg-surface rounded-full px-2 py-1">
            <TouchableOpacity
              className="p-1"
              onPress={() =>
                onUpdateQuantity && onUpdateQuantity(item.quantity - 1)
              }
            >
              <Ionicons name="remove" size={16} color={COLORS.primary} />
            </TouchableOpacity>
            <Text className="text-primary font-medium mx-3">{item.quantity}</Text>
            <TouchableOpacity
              className="p-1"
              onPress={() =>
                onUpdateQuantity && onUpdateQuantity(item.quantity + 1)
              }
            >
              <Ionicons name="add" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}