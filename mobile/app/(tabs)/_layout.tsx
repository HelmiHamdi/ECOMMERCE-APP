import React, { useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
// 👇 AJOUT — contexte des notifications (à adapter selon ton implémentation réelle)
import { useNotifications } from "@/context/NotificationContext";
import {
  View,
  TouchableOpacity,
  Modal,
  Pressable,
  Text,
  StyleSheet,
} from "react-native";


const BW = {
  black: "#0A0A0A",
  gray500: "#8A8A8E",
  gray100: "#F2F2F3",
  white: "#FFFFFF",
};

// 👇 couleur du badge (rouge classique iOS/Android)
const BADGE_RED = "#FF3B30";

const QUICK_ACTIONS = [
  {
    id: "orders",
    icon: "receipt-outline",
    labelKey: "myOrders",
    route: "/orders",
  },
  {
    id: "track",
    icon: "location-outline",
    labelKey: "trackOrder",
    route: "/track-order",
  },
  {
    id: "offers",
    icon: "pricetag-outline",
    labelKey: "offers",
    route: "/offers",
  },
  {
    id: "support",
    icon: "help-buoy-outline",
    labelKey: "support",
    route: "/support",
  },
  {
    id: "notifications",
    icon: "notifications-outline",
    labelKey: "notifications",
    route: "/notifications",
  }
];

export default function TabLayout() {
  const { cartItems } = useCart();
  const router = useRouter();
  const { t } = useLanguage();
  const [menuVisible, setMenuVisible] = useState(false);

  // 👇 AJOUT — récupère le nombre de notifications non lues
  const { unreadCount } = useNotifications();

  const handleActionPress = (route: string) => {
    setMenuVisible(false);
    router.push(route as any);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: "#CDCDE0",
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#F0F0F0",
            height: 80,
            paddingBottom: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={26}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View className="relative">
                <Feather
                  name={focused ? "shopping-cart" : "shopping-cart"}
                  size={26}
                  color={color}
                />
                {cartItems?.length > 0 && (
                  <View
                    className="absolute -top-1 -right-2 bg-accent
              size-3 rounded-full items-center justify-center"
                  >
                    <Ionicons name="ellipse" size={6} color="white" />
                  </View>
                )}
              </View>
            ),
          }}
        />

       
        <Tabs.Screen
          name="more"
          listeners={{
            tabPress: (e) => {
             
              e.preventDefault();
              setMenuVisible(true);
            },
          }}
          options={{
            tabBarIcon: () => (
              <View style={styles.fabWrapper}>
                <View style={styles.fab}>
                  <Ionicons name="add" size={28} color={BW.white} />
                </View>
                {/* 👇 AJOUT — badge sur le bouton "+" central si des notifications sont non lues */}
                {unreadCount > 0 && (
                  <View style={styles.fabBadge}>
                    <Text style={styles.fabBadgeText}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            ),
            tabBarButton: (props: any) => (
              <TouchableOpacity
                {...props}
                delayLongPress={props.delayLongPress ?? undefined}
                activeOpacity={0.85}
                style={[props.style, { top: -18 }]}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="favorite"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "heart" : "heart-outline"}
                size={26}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={26}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen name="change-password" options={{ href: null }} />
        <Tabs.Screen name="edit-profile" options={{ href: null }} />
        <Tabs.Screen name="offers" options={{ href: null }} />
        <Tabs.Screen name="support" options={{ href: null }} />
        <Tabs.Screen name="track-order" options={{ href: null }} />
       
      </Tabs>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)} className="mb-10">
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />

            <Text style={styles.sheetTitle}>{t("quickMenu")}</Text>

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

                    {/* 👇 AJOUT — badge rouge avec le nombre de notifications non lues */}
                    {action.id === "notifications" && unreadCount > 0 && (
                      <View style={styles.notifBadge}>
                        <Text style={styles.notifBadgeText}>
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.gridLabel} numberOfLines={2}>
                    {t(action.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.cancelBtn}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.cancelText}>{t("cancel")}</Text>
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
    width: 56,
    height: 56,
    borderRadius: 28,
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
  // 👇 AJOUT — badge sur le FAB central
  fabBadge: {
    position: "absolute",
    top: -2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BADGE_RED,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  fabBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
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
    // 👇 nécessaire pour que le badge en position absolute se place bien par rapport à ce conteneur
    position: "relative",
  },
  // 👇 AJOUT — badge rouge sur l'icône "notifications" dans la grille
  notifBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BADGE_RED,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  notifBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
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