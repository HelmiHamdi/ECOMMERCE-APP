import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getStatusConfig } from "@/constants";
import { useLanguage } from "@/context/LanguageContext";

export default function StatusBadge({
  status,
  size = "md",
}: {
  status?: string | null; // 👈 CORRECTION — accepte string générique, pas seulement l'union stricte
  size?: "sm" | "md";
}) {
  const { t } = useLanguage();
  const config = getStatusConfig(status); // 👈 CORRECTION — lookup sécurisé
  const isSmall = size === "sm";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: config.bgColor,
        paddingHorizontal: isSmall ? 8 : 10,
        paddingVertical: isSmall ? 3 : 5,
        borderRadius: 999,
        alignSelf: "flex-start",
      }}
    >
      <Ionicons name={config.icon as any} size={isSmall ? 11 : 13} color={config.color} />
      <Text
        style={{
          color: config.color,
          fontSize: isSmall ? 10 : 12,
          fontWeight: "700",
          marginLeft: 4,
        }}
      >
        {t(config.labelKey) ?? config.defaultLabel}
      </Text>
    </View>
  );
}