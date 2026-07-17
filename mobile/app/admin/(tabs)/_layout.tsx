import React, { useEffect, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import {
  View,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";
import { useUser } from "@clerk/clerk-expo";
import { useLanguage } from "@/context/LanguageContext";

const BW = {
  black: "#0A0A0A",
  gray500: "#8A8A8E",
  gray100: "#F2F2F3",
  white: "#FFFFFF",
};

export default function AdminTabsLayout() {
  const { user, isLoaded } = useUser();
  const { t } = useLanguage();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (isLoaded && (!user || user.publicMetadata?.role !== "admin")) {
      router.replace("/(tabs)");
    }
  }, [isLoaded, user]);

  // ------- Actions du menu rapide admin -------
  const QUICK_ACTIONS = [
    {
      id: "users",
      icon: "people-outline",
      labelKey: t("users") ?? "Utilisateurs",
      route: "/admin/users",
    },
    {
      id: "offers",
      icon: "pricetag-outline",
      labelKey: t("manageOffers") ?? "Offres",
      route: "/admin/offers",
    },
    {
      id: "support",
      icon: "chatbox-ellipses-outline",
      labelKey: t("manageSupport") ?? "Support",
      route: "/admin/support",
    },
  ];

  const handleActionPress = (route: string) => {
    setMenuVisible(false);
    router.push(route as any);
  };

  if (!isLoaded) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user || user.publicMetadata?.role !== "admin") return null;

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: {
            backgroundColor: "#fff",
          },
          headerTintColor: COLORS.primary,
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerShadowVisible: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: "gray",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)")}
              className="mr-4 flex-row items-center"
            >
              <Ionicons name="log-out-outline" size={24} color={COLORS.primary} />
              <Text className="ml-1 text-primary font-medium">{t("exit")}</Text>
            </TouchableOpacity>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("dashboard"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: t("products"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube-outline" size={size} color={color} />
            ),
          }}
        />

        {/* ------- Bouton central flottant "+" (menu rapide) ------- */}
        <Tabs.Screen
          name="more"
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setMenuVisible(true);
            },
          }}
          options={{
            title: "",
            tabBarIcon: () => (
              <View style={styles.fabWrapper}>
                <View style={styles.fab}>
                  <Ionicons name="add" size={26} color={BW.white} />
                </View>
              </View>
            ),
            tabBarButton: (props: any) => (
              <TouchableOpacity
                {...props}
                delayLongPress={props.delayLongPress ?? undefined}
                activeOpacity={0.85}
                style={[props.style, { top: -14 }]}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="orders"
          options={{
            title: t("orders"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="banners"
          options={{
            title: t("banners"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="image-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* ------- MODAL : menu rapide admin ------- */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)} className="mb-6">
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />

            <Text style={styles.sheetTitle}>{t("quickMenu") ?? "Menu rapide"}</Text>

            <View style={styles.grid}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  activeOpacity={0.7}
                  style={styles.gridItem}
                  onPress={() => handleActionPress(action.route)}
                >
                  <View style={styles.gridIconWrap}>
                    <Ionicons name={action.icon as any} size={22} color={BW.black} />
                  </View>
                  <Text style={styles.gridLabel} numberOfLines={2}>
                    {action.labelKey}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.cancelBtn}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.cancelText}>{t("cancel") ?? "Annuler"}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderWidth: 4,
    borderColor: "#fff",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: BW.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BW.gray100,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: BW.black,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    width: "31%",
    alignItems: "center",
    marginBottom: 20,
  },
  gridIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: BW.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: BW.black,
    textAlign: "center",
  },
  cancelBtn: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: BW.gray100,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: BW.black,
  },
});