import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { CategoryItemProps } from "@/constants/types";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";
import { useLanguage } from "@/context/LanguageContext";

export default function CategoryItem({
  item,
  isSelected,
  onPress,
}: CategoryItemProps) {
  const { t } = useLanguage();

  const displayName = item.nameKey ? t(item.nameKey as any) : item.name;

  return (
    <TouchableOpacity className="mr-4 items-center" onPress={onPress}>
      <View
        className={`w-14 h-14 rounded-full items-center justify-center mb-2 ${
          isSelected ? "bg-primary" : "bg-surface"
        }`}
      >
        <Ionicons
          name={item.icon as any}
          size={24}
          color={isSelected ? "#FFF" : COLORS.primary}
        />
      </View>
      <Text
        className={`text-xs font-medium ${
          isSelected ? "text-primary" : "text-secondary"
        }`}
      >
        {displayName}
      </Text>
    </TouchableOpacity>
  );
}