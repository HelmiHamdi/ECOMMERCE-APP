import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Header from "@/components/Header";
import { COLORS } from "@/constants";
import { useLanguage } from "@/context/LanguageContext";

const SECTIONS = [
  { icon: "document-text-outline", titleKey: "privacySection1Title", bodyKey: "privacySection1Body" },
  { icon: "settings-outline", titleKey: "privacySection2Title", bodyKey: "privacySection2Body" },
  { icon: "shield-checkmark-outline", titleKey: "privacySection3Title", bodyKey: "privacySection3Body" },
  { icon: "person-circle-outline", titleKey: "privacySection4Title", bodyKey: "privacySection4Body" },
  { icon: "mail-outline", titleKey: "privacySection5Title", bodyKey: "privacySection5Body" },
] as const;

export default function PrivacyPolicy() {
  const { t } = useLanguage();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={t("privacyPolicy")} showBack />
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
       
        <View className="bg-primary/5 border border-primary/10 rounded-2xl p-5 mb-5 items-center">
          <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-3">
            <Ionicons name="lock-closed-outline" size={26} color={COLORS.primary} />
          </View>
          <Text className="text-secondary text-xs mb-2">
            {t("lastUpdated")} · 15/06/2026
          </Text>
          <Text className="text-primary text-base leading-6 text-center">
            {t("privacyIntro")}
          </Text>
        </View>

      
        {SECTIONS.map((section, index) => (
          <View
            key={section.titleKey}
            className="bg-white rounded-xl border border-gray-100 p-4 mb-4"
          >
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-3">
                <Ionicons name={section.icon as any} size={20} color={COLORS.primary} />
              </View>
              <Text className="flex-1 text-primary font-bold text-base">
                {t(section.titleKey)}
              </Text>
            </View>
            <Text className="text-secondary text-sm leading-6">
              {t(section.bodyKey)}
            </Text>
          </View>
        ))}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}