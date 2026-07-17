import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import React, { useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import { Ionicons } from "@expo/vector-icons";
import { PROFILE_MENU } from "@/constants";
import { useClerk, useAuth } from "@clerk/clerk-expo";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/constants/api";

// Palette stricte noir & blanc
const BW = {
  black: "#0A0A0A",
  charcoal: "#1F1F1F",
  gray900: "#2E2E2E",
  gray500: "#8A8A8E",
  gray200: "#E5E5E7",
  gray100: "#F2F2F3",
  white: "#FFFFFF",
};

// Items ajoutés manuellement (Edit Profile & Change Password)
// en plus de PROFILE_MENU
const EXTRA_MENU = [
  {
    id: "edit-profile",
    icon: "person-outline",
    titleKey: "editProfile",
    route: "/edit-profile",
  },
  {
    id: "change-password",
    icon: "lock-closed-outline",
    titleKey: "changePassword",
    route: "/change-password",
  },
];

export default function Profile() {
  const { user, signOut } = useClerk();
  const { getToken } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

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
      setProfileName(data.name || `${user.firstName} ${user.lastName}`);
    } catch (err: any) {
      console.error(err);
      setProfileImage(user.imageUrl);
      setProfileName(`${user.firstName} ${user.lastName}`);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/sign-in");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const initials =
    profileName?.trim()?.charAt(0)?.toUpperCase() ||
    user?.firstName?.charAt(0)?.toUpperCase() ||
    "?";

  const isAdmin = user?.publicMetadata?.role === "admin";

  // Menu final = items ajoutés + menu existant
  const fullMenu = [...EXTRA_MENU, ...PROFILE_MENU];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Header title={t("account")} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={
          !user
            ? { flex: 1, justifyContent: "center", alignItems: "center" }
            : { paddingBottom: 40 }
        }
        showsVerticalScrollIndicator={false}
      >
        {!user ? (
          // ------- GUEST STATE -------
          <View className="items-center w-full px-8">
            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-6"
              style={{ backgroundColor: BW.gray100, borderWidth: 1, borderColor: BW.gray200 }}
            >
              <Ionicons name="person-outline" size={38} color={BW.black} />
            </View>
            <Text
              className="font-bold text-xl mb-2"
              style={{ color: BW.black, letterSpacing: 0.2 }}
            >
              {t("guestUser")}
            </Text>
            <Text
              className="text-base mb-8 text-center w-3/4"
              style={{ color: BW.gray500, lineHeight: 20 }}
            >
              {t("guestSubtitle")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/sign-in")}
              className="w-3/5 py-3.5 rounded-full items-center"
              style={{ backgroundColor: BW.black }}
            >
              <Text className="text-white font-bold text-base">
                {t("loginSignUp")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ------- HERO (réduit) ------- */}
            <View
              style={{
                backgroundColor: BW.black,
                paddingTop: 20,
                paddingBottom: isAdmin ? 26 : 22,
                borderBottomLeftRadius:200,
                borderBottomRightRadius: 200,
                alignItems: "center",
                overflow: "hidden",
              }}
            >
              {/* Motif géométrique discret */}
              <View
                style={{
                  position: "absolute",
                  width: 180,
                  height: 180,
                  borderRadius: 90,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  top: -80,
                  right: -60,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  width: 110,
                  height: 110,
                  borderRadius: 55,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.06)",
                  bottom: -45,
                  left: -30,
                }}
              />

              {/* Photo de profil - non cliquable, purement affichage */}
              <View
                className="rounded-full mb-3"
                style={{
                  padding: 3,
                  backgroundColor: "rgba(255,255,255,0.12)",
                }}
              >
                {profileImage || user.imageUrl ? (
                  <Image
                    source={{ uri: profileImage || user.imageUrl }}
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 48,
                      borderWidth: 2,
                      borderColor: BW.white,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 48,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: BW.white,
                    }}
                  >
                    <Text
                      className="font-bold text-2xl"
                      style={{ color: BW.black }}
                    >
                      {initials}
                    </Text>
                  </View>
                )}
              </View>

              {/* Nom complet sur une seule ligne, taille réduite si trop long */}
              <View style={{ paddingHorizontal: 24, width: "100%" }}>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                  className="font-bold text-white text-center"
                  style={{ fontSize: 19, letterSpacing: 0.2 }}
                >
                  {profileName || `${user.firstName} ${user.lastName}`}
                </Text>
              </View>

              <Text
                numberOfLines={1}
                className="text-sm mt-1"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                {user.emailAddresses[0].emailAddress}
              </Text>

              {isAdmin && (
                <TouchableOpacity
                  onPress={() => router.push("/admin")}
                  className="mt-4 px-5 py-2 rounded-full flex-row items-center"
                  style={{
                    backgroundColor: BW.white,
                  }}
                >
                  <Ionicons name="shield-checkmark" size={16} color={BW.black} />
                  <Text
                    className="font-semibold ml-2"
                    style={{ color: BW.black }}
                  >
                    {t("adminPanel")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ------- MENU CARD ------- */}
            <Text
              className="text-xs font-bold mx-6 mt-8 mb-2"
              style={{ color: BW.gray500, letterSpacing: 1 }}
            >
              {t("account")?.toUpperCase?.() ?? "MENU"}
            </Text>

            <View
              className="bg-white rounded-2xl mx-4 overflow-hidden"
              style={{
                borderWidth: 1,
                borderColor: BW.gray200,
              }}
            >
              {fullMenu.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.5}
                  className={`flex-row items-center px-4 py-4 ${
                    index !== fullMenu.length - 1 ? "border-b" : ""
                  }`}
                  style={
                    index !== fullMenu.length - 1
                      ? { borderColor: BW.gray100 }
                      : undefined
                  }
                  onPress={() => router.push(item.route as any)}
                >
                  <View
                    className="w-11 h-11 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: BW.gray100 }}
                  >
                    <Ionicons name={item.icon as any} size={19} color={BW.black} />
                  </View>
                  <Text
                    className="flex-1 font-semibold text-[15px]"
                    style={{ color: BW.black }}
                  >
                    {t(item.titleKey as any)}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={BW.gray500} />
                </TouchableOpacity>
              ))}
            </View>

            {/* ------- LOGOUT ------- */}
            <TouchableOpacity
              className="flex-row items-center justify-center py-4 mx-4 mt-10 rounded-2xl"
              activeOpacity={0.7}
              style={{ backgroundColor: BW.black }}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color={BW.white} />
              <Text
                className="font-bold ml-2 text-[15px]"
                style={{ color: BW.white }}
              >
                {t("logOut")}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}