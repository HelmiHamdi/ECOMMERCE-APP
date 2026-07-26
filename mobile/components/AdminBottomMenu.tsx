import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // 👈 AJOUT
import { COLORS, CATEGORIES } from "@/constants";
import { useLanguage } from "@/context/LanguageContext";

const BW = {
  black: "#0A0A0A",
  gray500: "#8A8A8E",
  gray100: "#F2F2F3",
  white: "#FFFFFF",
};

// Onglets qui matchent EXACTEMENT ceux de app/admin/(tabs)/_layout.tsx
const TABS = [
  { key: "index", route: "/admin", icon: "grid-outline", labelKey: "dashboard" },
  { key: "products", route: "/admin/products", icon: "cube-outline", labelKey: "products" },
  { key: "orders", route: "/admin/orders", icon: "receipt-outline", labelKey: "orders" },
  { key: "banners", route: "/admin/banners", icon: "image-outline", labelKey: "banners" },
] as const;

export default function AdminBottomMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets(); // 👈 AJOUT
  const [menuVisible, setMenuVisible] = useState(false);

  const QUICK_ACTIONS = [
    {
      id: "users",
      icon: "people-outline",
      labelKey: t("users") ?? "Utilisateurs",
      route: "/admin/users",
    },
    {
      id: "orders-list",
      icon: "file-tray-full-outline",
      labelKey: t("ordersList") ?? "Commandes détaillées",
      route: "/admin/orders-list",
    },
    {
      id: "gifs",
      icon: "film-outline",
      labelKey: t("gifs") ?? "Gifs",
      route: "/admin/gifs",
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
    {
      id: "devis",
      icon: "document-text-outline",
      labelKey: t("manageDevis") ?? "Demandes de devis",
      route: "/admin/devis",
    },
  ];

  const CATEGORY_ACTIONS = CATEGORIES.map((cat) => ({
    id: `cat-${cat.nameKey}`,
    icon: cat.icon,
    labelKey: t(cat.nameKey) ?? cat.nameKey,
    route: `/admin/products/category/${cat.nameKey}`,
  }));

  const handleActionPress = (route: string) => {
    setMenuVisible(false);
    router.push(route as any);
  };

  return (
    <>
      {/* 👇 CORRECTION — hauteur et paddingBottom dynamiques selon
          l'appareil (encoche, indicateur home iOS, barre de navigation
          Android), pour que le contenu de la barre ne soit jamais coupé */}
      <View style={[styles.bar, { height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
        {TABS.slice(0, 2).map((tab) => {
          const active = pathname === tab.route;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              activeOpacity={0.7}
              onPress={() => router.push(tab.route as any)}
            >
              <Ionicons
                name={tab.icon as any}
                size={22}
                color={active ? COLORS.primary : BW.gray500}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? COLORS.primary : BW.gray500 },
                ]}
              >
                {t(tab.labelKey) ?? tab.labelKey}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.fabWrapper}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.fab}
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons name="add" size={26} color={BW.white} />
          </TouchableOpacity>
        </View>

        {TABS.slice(2).map((tab) => {
          const active = pathname === tab.route;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              activeOpacity={0.7}
              onPress={() => router.push(tab.route as any)}
            >
              <Ionicons
                name={tab.icon as any}
                size={22}
                color={active ? COLORS.primary : BW.gray500}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? COLORS.primary : BW.gray500 },
                ]}
              >
                {t(tab.labelKey) ?? tab.labelKey}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: 28 + insets.bottom }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handle} />

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
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

              <View style={styles.sectionDivider} />
              <Text style={styles.sectionTitle}>
                {t("browseByCategory") ?? "Parcourir par catégorie"}
              </Text>

              <View style={styles.grid}>
                {CATEGORY_ACTIONS.map((action) => (
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
            </ScrollView>

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
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  fabWrapper: {
    alignItems: "center",
    justifyContent: "center",
    top: -20,
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
  sectionDivider: {
    height: 1,
    backgroundColor: BW.gray100,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: BW.gray500,
    marginBottom: 12,
    textTransform: "uppercase",
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
    marginTop: 12,
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