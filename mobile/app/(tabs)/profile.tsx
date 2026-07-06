import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import React, { useState,  useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, PROFILE_MENU } from "@/constants";
import { useClerk, useAuth } from "@clerk/clerk-expo";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/constants/api";


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
    } catch (err : any) {
      console.error(err)
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
    console.log("Logout pressed");
    try {
        await signOut();
        console.log("signOut() success");
        router.replace("/sign-in");
    } catch (err) {
        console.error("Logout error:", err);
    }
};
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={t("account")} />
      <ScrollView
        className="flex-1 px4"
        contentContainerStyle={
          !user
            ? { flex: 1, justifyContent: "center", alignItems: "center" }
            : { paddingTop: 16 }
        }
      >
        {!user ? (
          <View className="items-center w-full">
            <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center mb-6">
              <Ionicons name="person" size={40} color={COLORS.secondary} />
            </View>
            <Text className="text-primary font-bold text-xl mb-2">
              {t("guestUser")}
            </Text>
            <Text className="text-secondary text-base mb-8 text-center w-3/4 px-4">
              {t("guestSubtitle")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/sign-in")}
              className="bg-primary w-3/5 py-3 rounded-full items-center shadow-lg"
            >
              <Text className="text-white font-bold text-lg">
                {t("loginSignUp")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
           
            <View className="items-center mb-8">
              <View className="mb-3">
                <Image
                  source={{ uri: profileImage || user.imageUrl }}
                  className="size-20 border-2 border-white shadow-sm rounded-full"
                />
              </View>
              <Text className="text-xl font-bold text-primary">
                {profileName || `${user.firstName} ${user.lastName}`}
              </Text>
              <Text className="text-secondary text-sm">
                {user.emailAddresses[0].emailAddress}
              </Text>
            
              {user.publicMetadata?.role === "admin" && (
                <TouchableOpacity
                  onPress={() => router.push("/admin")}
                  className="mt-4 bg-primary px-6 py-2 rounded-full"
                >
                  <Text className="text-white font-bold">{t("adminPanel")}</Text>
                </TouchableOpacity>
              )}
            </View>
          
            <View className="bg-white rounded-xl border border-gray-100/75 p-2 mb-4">
              {PROFILE_MENU.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  className={`flex-row items-center p-4 ${index !== PROFILE_MENU.length - 1 ? "border-b border-gray-100" : ""}`}
                  onPress={() => router.push(item.route as any)}
                >
                  <View className="w-10 h-10 bg-surface rounded-full items-center justify-center mr-4">
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={COLORS.primary}
                    />
                  </View>
                  <Text className="flex-1 text-primary font-medium">
                    {t(item.titleKey as any)}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={COLORS.secondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
           
            <TouchableOpacity
              className="flex-row items-center justify-center p-4"
              onPress={handleLogout}
            >
              <Text className="text-red-500 font-bold ml-2">{t("logOut")}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}