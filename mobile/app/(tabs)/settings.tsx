import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  Linking,
  Alert,
  I18nManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications"; // ← AJOUT
import Header from "@/components/Header";
import { COLORS } from "@/constants";
import { useLanguage, Language } from "@/context/LanguageContext";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";
import { useNotifications } from "@/context/NotificationContext";

const LANGUAGES: { code: Language; nameKey: string; flag: string }[] = [
  { code: "en", nameKey: "english", flag: "🇬🇧" },
  { code: "fr", nameKey: "french", flag: "🇫🇷" },
  { code: "ar", nameKey: "arabic", flag: "🇹🇳" },
];

const CURRENCIES = ["USD", "EUR", "TND"];

export default function Settings() {
  const router = useRouter();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { unreadCount } = useNotifications();

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [currency, setCurrency] = useState("USD");

  // Load saved preferences
  useEffect(() => {
    (async () => {
      const notif = await AsyncStorage.getItem("notificationsEnabled");
      const dark = await AsyncStorage.getItem("darkModeEnabled");
      const curr = await AsyncStorage.getItem("currency");
      if (notif !== null) setNotificationsEnabled(notif === "true");
      if (dark !== null) setDarkModeEnabled(dark === "true");
      if (curr !== null) setCurrency(curr);
    })();
  }, []);

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      // L'utilisateur active : on demande/vérifie la permission système
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        // Permission refusée par le système : on ne peut pas l'activer réellement
        Toast.show({
          type: "error",
          text1: t("notificationsPermissionDenied") ?? "Permission refusée",
          text2:
            t("notificationsPermissionDeniedHint") ??
            "Active les notifications dans les réglages du téléphone",
        });
        return;
      }
    }

    setNotificationsEnabled(value);
    await AsyncStorage.setItem("notificationsEnabled", String(value));
    Toast.show({
      type: "success",
      text1: value
        ? t("notificationsEnabled") ?? "Notifications activées"
        : t("notificationsDisabled") ?? "Notifications désactivées",
    });
  };

  const toggleDarkMode = async (value: boolean) => {
    setDarkModeEnabled(value);
    await AsyncStorage.setItem("darkModeEnabled", String(value));
    // TODO: brancher sur ton ThemeContext si tu en as un
  };

  const handleSelectLanguage = async (lang: Language) => {
    const wasRTL = isRTL;
    await setLanguage(lang);
    setLanguageModalVisible(false);

    const willBeRTL = lang === "ar";
    if (wasRTL !== willBeRTL) {
      // Changer la direction RTL nécessite un redémarrage de l'app
      I18nManager.forceRTL(willBeRTL);
      Alert.alert(t("restartRequired"), t("restartMessage"), [
        { text: t("ok") },
      ]);
    } else {
      Toast.show({ type: "success", text1: t("language") + " ✅" });
    }
  };

  const handleSelectCurrency = async (curr: string) => {
    setCurrency(curr);
    await AsyncStorage.setItem("currency", curr);
    setCurrencyModalVisible(false);
  };

  const handleClearCache = async () => {
    Alert.alert(t("clearCache"), "", [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("ok"),
        onPress: async () => {
          // Garde les préférences importantes (langue, devise, etc.)
          const keysToKeep = ["appLanguage", "currency", "notificationsEnabled", "darkModeEnabled"];
          const allKeys = await AsyncStorage.getAllKeys();
          const keysToRemove = allKeys.filter((k) => !keysToKeep.includes(k));
          await AsyncStorage.multiRemove(keysToRemove);
          Toast.show({ type: "success", text1: t("cacheCleared") });
        },
      },
    ]);
  };

  const currentLanguageLabel =
    LANGUAGES.find((l) => l.code === language)?.nameKey ?? "english";

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={t("settings")} showBack />

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {/* GENERAL */}
        <Text className="text-secondary text-xs font-bold uppercase mb-2 ml-1">
          {t("general")}
        </Text>
        <View className="bg-white rounded-xl border border-gray-100 mb-6">
          {/* Language */}
          <TouchableOpacity
            className="flex-row items-center p-4 border-b border-gray-100"
            onPress={() => setLanguageModalVisible(true)}
          >
            <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
              <Ionicons name="globe-outline" size={20} color={COLORS.primary} />
            </View>
            <Text className="flex-1 text-primary font-medium">{t("language")}</Text>
            <Text className="text-secondary mr-2">{t(currentLanguageLabel)}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
          </TouchableOpacity>

          {/* Currency */}
          <TouchableOpacity
            className="flex-row items-center p-4 border-b border-gray-100"
            onPress={() => setCurrencyModalVisible(true)}
          >
            <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
              <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
            </View>
            <Text className="flex-1 text-primary font-medium">{t("currency")}</Text>
            <Text className="text-secondary mr-2">{currency}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
          </TouchableOpacity>

          {/* Notifications — icône cliquable vers l'historique + switch pour activer/désactiver */}
          <View className="flex-row items-center p-4 border-b border-gray-100">
            <TouchableOpacity
              className="flex-row items-center flex-1"
              onPress={() => router.push("/notifications")}
            >
              <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
                <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
                {unreadCount > 0 && (
                  <View
                    className="absolute -top-1 -right-1 bg-red-500 rounded-full items-center justify-center"
                    style={{ minWidth: 18, height: 18, paddingHorizontal: 4 }}
                  >
                    <Text className="text-white text-[10px] font-bold">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="flex-1 text-primary font-medium">{t("notifications")}</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.secondary}
                style={{ marginRight: 8 }}
              />
            </TouchableOpacity>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: "#ccc", true: COLORS.primary }}
            />
          </View>

          {/* Dark Mode */}
          <View className="flex-row items-center p-4">
            <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
              <Ionicons name="moon-outline" size={20} color={COLORS.primary} />
            </View>
            <Text className="flex-1 text-primary font-medium">{t("darkMode")}</Text>
            <Switch
              value={darkModeEnabled}
              onValueChange={toggleDarkMode}
              trackColor={{ false: "#ccc", true: COLORS.primary }}
            />
          </View>
        </View>

        {/* ACCOUNT */}
        <Text className="text-secondary text-xs font-bold uppercase mb-2 ml-1">
          {t("account")}
        </Text>
        <View className="bg-white rounded-xl border border-gray-100 mb-6">
          <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100" onPress={() => router.push("/edit-profile")}>
            <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
              <Ionicons name="person-outline" size={20} color={COLORS.primary} />
            </View>
            <Text className="flex-1 text-primary font-medium">{t("editProfile")}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center p-4" onPress={()=>router.push("/change-password")}>
            <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} />
            </View>
            <Text className="flex-1 text-primary font-medium">{t("changePassword")}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>

        {/* SUPPORT */}
        <Text className="text-secondary text-xs font-bold uppercase mb-2 ml-1">
          {t("support")}
        </Text>
        <View className="bg-white rounded-xl border border-gray-100 mb-6">
          <TouchableOpacity
            className="flex-row items-center p-4 border-b border-gray-100"
            onPress={() => Linking.openURL("mailto:helmihamdi977@gmail.com")}
          >
            <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
              <Ionicons name="help-circle-outline" size={20} color={COLORS.primary} />
            </View>
            <Text className="flex-1 text-primary font-medium">{t("helpCenter")}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center p-4 border-b border-gray-100"
            onPress={() => Linking.openURL("mailto:helmi.hamdi@etudiant-fst.utm.tn")}
          >
            <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
              <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
            </View>
            <Text className="flex-1 text-primary font-medium">{t("contactUs")}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center p-4" onPress={() => router.push("/rate-app")}   >
            <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
              <Ionicons name="star-outline" size={20} color={COLORS.primary} />
            </View>
            <Text className="flex-1 text-primary font-medium">{t("rateApp")}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>

        {/* ABOUT */}
        <Text className="text-secondary text-xs font-bold uppercase mb-2 ml-1">
          {t("about")}
        </Text>
        <View className="bg-white rounded-xl border border-gray-100 mb-6">
          <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100" onPress={() => router.push("/privacy-policy")}>
            <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
              <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
            </View>
            <Text className="flex-1 text-primary font-medium">{t("privacyPolicy")}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100" onPress={() => router.push("/terms-of-service")}>
            <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
              <Ionicons name="reader-outline" size={20} color={COLORS.primary} />
            </View>
            <Text className="flex-1 text-primary font-medium">{t("termsOfService")}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center p-4 border-b border-gray-100"
            onPress={handleClearCache}
          >
            <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
              <Ionicons name="trash-outline" size={20} color={COLORS.primary} />
            </View>
            <Text className="flex-1 text-primary font-medium">{t("clearCache")}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
          </TouchableOpacity>

          <View className="flex-row items-center p-4">
            <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
              <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            </View>
            <Text className="flex-1 text-primary font-medium">{t("version")}</Text>
            <Text className="text-secondary">1.0.0</Text>
          </View>
        </View>
      </ScrollView>

      {/* LANGUAGE MODAL */}
      <Modal visible={languageModalVisible} animationType="slide" transparent>
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setLanguageModalVisible(false)}
        >
          <View className="bg-white rounded-t-2xl p-4">
            <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-gray-100">
              <Text className="text-lg font-bold text-primary">{t("selectLanguage")}</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                className={`p-4 rounded-xl mb-2 flex-row justify-between items-center ${
                  language === lang.code ? "bg-primary/10" : "bg-gray-50"
                }`}
                onPress={() => handleSelectLanguage(lang.code)}
              >
                <View className="flex-row items-center">
                  <Text className="text-xl mr-3">{lang.flag}</Text>
                  <Text
                    className={`font-medium ${
                      language === lang.code ? "text-primary font-bold" : "text-secondary"
                    }`}
                  >
                    {t(lang.nameKey)}
                  </Text>
                </View>
                {language === lang.code && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* CURRENCY MODAL */}
      <Modal visible={currencyModalVisible} animationType="slide" transparent>
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setCurrencyModalVisible(false)}
        >
          <View className="bg-white rounded-t-2xl p-4">
            <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-gray-100">
              <Text className="text-lg font-bold text-primary">{t("currency")}</Text>
              <TouchableOpacity onPress={() => setCurrencyModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            {CURRENCIES.map((curr) => (
              <TouchableOpacity
                key={curr}
                className={`p-4 rounded-xl mb-2 flex-row justify-between items-center ${
                  currency === curr ? "bg-primary/10" : "bg-gray-50"
                }`}
                onPress={() => handleSelectCurrency(curr)}
              >
                <Text
                  className={`font-medium ${
                    currency === curr ? "text-primary font-bold" : "text-secondary"
                  }`}
                >
                  {curr}
                </Text>
                {currency === curr && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}