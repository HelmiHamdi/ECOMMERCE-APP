import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  Pressable,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useClerk, useUser, useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, CATEGORIES } from "@/constants";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/constants/api";

const { width } = Dimensions.get("window");
const MENU_WIDTH = Math.min(width * 0.82, 330);

const INK = "#13131A";
const MUTED = "#8D8D96";
const SURFACE = "#F5F5F8";

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  route?: string;
};

function Tappable({
  onPress,
  children,
  style,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (v: number) =>
    Animated.spring(scale, {
      toValue: v,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(0.96)}
      onPressOut={() => animateTo(1)}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function SideMenu({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();

  const [modalMounted, setModalMounted] = useState(visible);

  const translateX = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const closeRotate = useRef(new Animated.Value(0)).current;
  const closeScale = useRef(new Animated.Value(1)).current;

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>("");

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const token = await getToken();
      const res = await api.get("/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data.data;
      setProfileImage(data.image || user.imageUrl);
      setProfileName(
        data.name || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      );
    } catch (err) {
      setProfileImage(user.imageUrl);
      setProfileName(`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim());
    }
  }, [user, getToken]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  useEffect(() => {
    if (visible && user) {
      loadProfile();
    }
  }, [visible, user, loadProfile]);

  useEffect(() => {
    if (visible) {
      setModalMounted(true);
      closeRotate.setValue(0);
      closeScale.setValue(1);
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          speed: 16,
          bounciness: 4,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 420,
          delay: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (modalMounted) {
      contentFade.setValue(0);

      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -MENU_WIDTH,
          duration: 260,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalMounted(false);
      });
    }
  }, [visible]);

  const go = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 260);
  };

  const handleClosePress = () => {
    Animated.parallel([
      Animated.timing(closeRotate, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(closeScale, {
          toValue: 0.8,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.timing(closeScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onClose();
    });
  };

  const handleLogout = async () => {
    onClose();
    try {
      await signOut();
      setTimeout(() => router.replace("/sign-in"), 260);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const shopItems: MenuItem[] = [
  { icon: "home-outline", labelKey: "home", route: "/" },
  { icon: "grid-outline", labelKey: "shop", route: "/shop" },
  { icon: "heart-outline", labelKey: "wishlist", route: "/favorite" },
  { icon: "cart-outline", labelKey: "cart", route: "/cart" },
  { icon: "receipt-outline", labelKey: "myOrders", route: "/orders" },
];
  const accountItems: MenuItem[] = [
    { icon: "person-outline", labelKey: "editProfile", route: "/edit-profile" },
    {
      icon: "notifications-outline",
      labelKey: "notifications",
      route: "/notifications",
    },
    { icon: "settings-outline", labelKey: "settings", route: "/settings" },
  ];

  const supportItems: MenuItem[] = [
    { icon: "help-circle-outline", labelKey: "helpCenter", route: "/settings" },
    { icon: "star-outline", labelKey: "rateApp", route: "/rate-app" },
  ];

  const panelTop = insets.top + 8;
  const panelBottom = insets.bottom + 8;

  const glowScale = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.14],
  });
  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.85],
  });

  return (
    <Modal
      visible={modalMounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "rgba(10,10,14,0.55)",
          opacity: backdropOpacity,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          top: panelTop,
          bottom: panelBottom,
          left: 0,
          width: MENU_WIDTH,
          backgroundColor: "#fff",
          transform: [{ translateX }],
          borderTopRightRadius: 20,
          borderBottomRightRadius: 40,
          overflow: "hidden",
          flexDirection: "column",
          shadowColor: "#000",
          shadowOpacity: 0.22,
          shadowRadius: 28,
          shadowOffset: { width: 10, height: 0 },
          elevation: 14,
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.primary,
            paddingTop: 26,
            paddingBottom: 40,
            paddingHorizontal: 22,
            borderBottomRightRadius: 46,
            overflow: "hidden",
            alignItems: "center",
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -60,
              right: -50,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: "rgba(255,255,255,0.14)",
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: -70,
              left: -40,
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: "rgba(0,0,0,0.10)",
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 30,
              left: -30,
              width: 90,
              height: 90,
              borderRadius: 45,
              backgroundColor: "rgba(255,255,255,0.08)",
            }}
          />

          <View
            style={{ width: "100%", alignItems: "flex-end", marginBottom: 4 }}
          >
            <Pressable onPress={handleClosePress} hitSlop={10}>
              <Animated.View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "rgba(255,255,255,0.22)",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [
                    { scale: closeScale },
                    {
                      rotate: closeRotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "180deg"],
                      }),
                    },
                  ],
                }}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </Animated.View>
            </Pressable>
          </View>

          {user ? (
            <Tappable
              onPress={() => go("/profile")}
              style={{ alignItems: "center" }}
            >
              <View style={{ width: 108, height: 108, marginBottom: 14 }}>
                <Animated.View
                  style={{
                    position: "absolute",
                    width: 108,
                    height: 108,
                    borderRadius: 54,
                    backgroundColor: "rgba(255,255,255,0.35)",
                    opacity: glowOpacity,
                    transform: [{ scale: glowScale }],
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    width: 92,
                    height: 92,
                    top: 8,
                    left: 8,
                    borderRadius: 46,
                    backgroundColor: "rgba(255,255,255,0.18)",
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    width: 80,
                    height: 80,
                    top: 14,
                    left: 14,
                    borderRadius: 40,
                    overflow: "hidden",
                    backgroundColor: "#fff",
                    borderWidth: 3,
                    borderColor: "#fff",
                  }}
                >
                  {profileImage ? (
                    <Image
                      source={{ uri: profileImage }}
                      style={{ width: "100%", height: "100%" }}
                      onError={() => setProfileImage(user?.imageUrl ?? null)}
                    />
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: SURFACE,
                      }}
                    >
                      <Ionicons
                        name="person"
                        size={40}
                        color={MUTED}
                        style={{ marginTop: 6 }}
                      />
                    </View>
                  )}
                </View>
              </View>

              <Text
                style={{
                  color: "#fff",
                  fontWeight: "800",
                  fontSize: 17,
                  letterSpacing: -0.2,
                  textAlign: "center",
                }}
                numberOfLines={1}
              >
                {profileName ||
                  `${user.firstName ?? ""} ${user.lastName ?? ""}`}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 12.5,
                  marginTop: 2,
                  textAlign: "center",
                }}
                numberOfLines={1}
              >
                {user.emailAddresses[0]?.emailAddress}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  alignSelf: "center",
                  marginTop: 12,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 11.5, fontWeight: "700" }}
                >
                  {t("seeProfile") ?? "Voir le profil"}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={12}
                  color="#fff"
                  style={{ marginLeft: 5 }}
                />
              </View>
            </Tappable>
          ) : (
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <Ionicons name="person" size={26} color="#fff" />
              </View>
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "800",
                  fontSize: 17,
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                {t("guestUser") ?? "Invité"}
              </Text>
              <Tappable
                onPress={() => go("/sign-in")}
                style={{ width: "100%" }}
              >
                <View
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 999,
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.primary,
                      fontWeight: "800",
                      fontSize: 13,
                    }}
                  >
                    {t("loginSignUp") ?? "Se connecter"}
                  </Text>
                </View>
              </Tappable>
            </View>
          )}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <Animated.View style={{ opacity: contentFade, paddingTop: 16 }}>
            <SectionLabel title={t("categories") ?? "Catégories"} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                gap: 10,
                paddingBottom: 4,
              }}
              style={{ marginBottom: 18 }}
            >
              {CATEGORIES.map((cat: any) => (
                <Tappable
                  key={cat.id}
                  onPress={() =>
                    go(
                      `/category?category=${cat.nameKey}&categoryName=${cat.nameKey}`,
                    )
                  }
                >
                  <View style={{ alignItems: "center", width: 68 }}>
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 18,
                        backgroundColor: SURFACE,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 6,
                        borderWidth: 1,
                        borderColor: "#EEEEF2",
                      }}
                    >
                      <Ionicons
                        name={(cat.icon ?? "pricetag-outline") as any}
                        size={20}
                        color={COLORS.primary}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        color: INK,
                        fontWeight: "600",
                        textAlign: "center",
                      }}
                      numberOfLines={1}
                    >
                      {t(cat.nameKey as any) ?? cat.name}
                    </Text>
                  </View>
                </Tappable>
              ))}
            </ScrollView>

            <SectionLabel title={t("shop") ?? "Boutique"} />
            <View style={{ marginBottom: 6 }}>
              {shopItems.map((item) => (
                <MenuRow
                  key={item.labelKey}
                  item={item}
                  t={t}
                  onPress={() => go(item.route!)}
                />
              ))}
            </View>

            {user && (
              <>
                <SectionLabel title={t("account") ?? "Compte"} />
                <View style={{ marginBottom: 6 }}>
                  {accountItems.map((item) => (
                    <MenuRow
                      key={item.labelKey}
                      item={item}
                      t={t}
                      onPress={() => go(item.route!)}
                    />
                  ))}
                </View>
              </>
            )}

            <SectionLabel title={t("support") ?? "Support"} />
            <View style={{ marginBottom: 6 }}>
              {supportItems.map((item) => (
                <MenuRow
                  key={item.labelKey}
                  item={item}
                  t={t}
                  onPress={() => go(item.route!)}
                />
              ))}
            </View>

            {/* Logout */}
            {user && (
              <View style={{ paddingHorizontal: 18, marginTop: 16 }}>
                <Tappable onPress={handleLogout}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 20,
                      backgroundColor: "#FEF2F2",
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        backgroundColor: "#FFE1E1",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons
                        name="log-out-outline"
                        size={16}
                        color="#EF4444"
                      />
                    </View>
                    <Text
                      style={{
                        color: "#EF4444",
                        fontWeight: "700",
                        fontSize: 14,
                      }}
                    >
                      {t("logOut") ?? "Déconnexion"}
                    </Text>
                  </View>
                </Tappable>
              </View>
            )}

            <Text
              style={{
                textAlign: "center",
                color: "#D4D4DA",
                fontSize: 11,
                marginTop: 22,
              }}
            >
              v1.0.0
            </Text>
          </Animated.View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        marginBottom: 8,
        marginTop: 4,
      }}
    >
      <View
        style={{
          width: 3,
          height: 12,
          borderRadius: 2,
          backgroundColor: COLORS.primary,
          marginRight: 8,
        }}
      />
      <Text
        style={{
          color: MUTED,
          fontSize: 11.5,
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

function MenuRow({
  item,
  t,
  onPress,
}: {
  item: MenuItem;
  t: (key: any) => string;
  onPress: () => void;
}) {
  return (
    <Tappable onPress={onPress}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 11,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: SURFACE,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          <Ionicons name={item.icon} size={17} color={COLORS.primary} />
        </View>
        <Text style={{ flex: 1, color: INK, fontSize: 14, fontWeight: "600" }}>
          {t(item.labelKey) ?? item.labelKey}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#D4D4DA" />
      </View>
    </Tappable>
  );
}
