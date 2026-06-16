import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import Header from "@/components/Header";
import { COLORS } from "@/constants";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/constants/api";


export default function EditProfileScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setFetching(true);
    try {
      const token = await getToken();
      const res = await api.get("/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data.data;
      const fullName = (data.name || "").trim();
      const parts = fullName.split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
      setPhone(data.phone || "");
      setEmail(data.email || "");
      setImageUri(data.image || null);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: t("error"),
        text2: t("somethingWrong"),
      });
    } finally {
      setFetching(false);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({
        type: "error",
        text1: t("permissionDenied"),
        text2: t("photoPermissionMessage"),
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
      setImageChanged(true);
    }
  };

  const onSave = async () => {
    if (!firstName.trim()) {
      Toast.show({
        type: "error",
        text1: t("missingFields"),
        text2: t("firstNameRequired"),
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", `${firstName.trim()} ${lastName.trim()}`.trim());
      formData.append("firstName", firstName.trim());
      formData.append("lastName", lastName.trim());
      formData.append("phone", phone.trim());

      if (imageChanged && imageUri) {
        const filename = imageUri.split("/").pop() || "avatar.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";
        formData.append("image", {
          uri: imageUri,
          name: filename,
          type,
        } as any);
      }

      const token = await getToken();

      await api.put("/users/me", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      await user?.reload();

      Toast.show({
        type: "success",
        text1: t("profileUpdated"),
      });
      router.back();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: t("error"),
        text2: err?.response?.data?.message ?? t("somethingWrong"),
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={t("editProfile")} showBack />

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {/* Profile Image */}
        <View className="items-center mb-8">
          <TouchableOpacity onPress={pickImage} className="relative">
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={{ width: 100, height: 100, borderRadius: 50 }}
              />
            ) : (
              <View
                style={{ width: 100, height: 100, borderRadius: 50 }}
                className="bg-gray-200 items-center justify-center"
              >
                <Ionicons name="person" size={50} color={COLORS.secondary} />
              </View>
            )}
            <View
              className="absolute bottom-0 right-0 bg-primary rounded-full p-2"
              style={{ borderWidth: 2, borderColor: "white" }}
            >
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text className="text-secondary mt-2">{t("changePhoto")}</Text>
        </View>

        {/* First Name */}
        <View className="mb-4">
          <Text className="text-primary font-medium mb-2">{t("firstName")}</Text>
          <TextInput
            className="w-full bg-white p-4 rounded-xl text-primary border border-gray-100"
            placeholder="John"
            placeholderTextColor="#999"
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>

        {/* Last Name */}
        <View className="mb-4">
          <Text className="text-primary font-medium mb-2">{t("lastName")}</Text>
          <TextInput
            className="w-full bg-white p-4 rounded-xl text-primary border border-gray-100"
            placeholder="Doe"
            placeholderTextColor="#999"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        {/* Email (read-only) */}
        <View className="mb-4">
          <Text className="text-primary font-medium mb-2">{t("email")}</Text>
          <View className="w-full bg-gray-100 p-4 rounded-xl border border-gray-100">
            <Text className="text-secondary">{email}</Text>
          </View>
        </View>

        {/* Phone */}
        <View className="mb-8">
          <Text className="text-primary font-medium mb-2">{t("phone")}</Text>
          <TextInput
            className="w-full bg-white p-4 rounded-xl text-primary border border-gray-100"
            placeholder="+216 00 000 000"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          className={`w-full py-4 rounded-full items-center mb-10 ${
            loading ? "bg-gray-300" : "bg-primary"
          }`}
          onPress={onSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">{t("saveChanges")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}