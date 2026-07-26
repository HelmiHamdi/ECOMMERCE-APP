import React, { useCallback } from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAppSettings } from "@/app/hooks/useAppSettings";
import { useLanguage } from "@/context/LanguageContext";
import { COLORS } from "@/constants";

export default function DevisButton({ productId }: { productId: string }) {
  const { devisEnabled, loading, refresh } = useAppSettings();
  const router = useRouter();
  const { t } = useLanguage();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (loading || !devisEnabled) return null;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: COLORS.primary }]}
      onPress={() =>
        router.push({
          pathname: "/devis/[productId]",
          params: { productId },
        })
      }
    >
      <Text style={styles.text}>{t("requestQuote") ?? "Demander un devis"}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  text: { color: "#fff", fontWeight: "700", fontSize: 15 },
});