import { COLORS } from "@/constants";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as React from "react";
import {
  Pressable,
  TextInput,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useLanguage } from "@/context/LanguageContext";

type FieldKey = "currentPassword" | "newPassword" | "confirmPassword";

// ✅ PasswordField BARRA mel ChangePasswordScreen — haka ma ytrekch el focus
const PasswordField = ({
  label,
  value,
  onChangeText,
  fieldKey,
  error,
  showPasswords,
  toggleShow,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  fieldKey: FieldKey;
  error?: string;
  showPasswords: Record<FieldKey, boolean>;
  toggleShow: (field: FieldKey) => void;
}) => (
  <View className="mb-5">
    <Text className="text-primary font-medium mb-2">{label}</Text>
    <View className="relative">
      <TextInput
        className={`w-full bg-surface p-4 pr-12 rounded-xl text-primary ${
          error ? "border border-red-400" : ""
        }`}
        placeholder="••••••••"
        placeholderTextColor="#999"
        secureTextEntry={!showPasswords[fieldKey]}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        onPress={() => toggleShow(fieldKey)}
        className="absolute right-4 top-0 bottom-0 justify-center"
      >
        <Ionicons
          name={showPasswords[fieldKey] ? "eye-off-outline" : "eye-outline"}
          size={22}
          color={COLORS.secondary}
        />
      </TouchableOpacity>
    </View>
    {error ? (
      <Text className="text-red-500 text-xs mt-1 ml-1">{error}</Text>
    ) : null}
  </View>
);

export default function ChangePasswordScreen() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { t } = useLanguage();

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const [showPasswords, setShowPasswords] = React.useState<
    Record<FieldKey, boolean>
  >({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const toggleShow = (field: FieldKey) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const passwordsMatch =
    confirmPassword.length === 0 || newPassword === confirmPassword;
  const newPasswordLongEnough =
    newPassword.length === 0 || newPassword.length >= 8;
  const isFormValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  const onChangePassword = async () => {
    if (!isLoaded || !user) return;

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: t("passwordMismatch") ?? "Passwords do not match",
      });
      return;
    }

    if (newPassword.length < 8) {
      Toast.show({
        type: "error",
        text1:
          t("passwordTooShort") ?? "Password must be at least 8 characters",
      });
      return;
    }

    setLoading(true);
    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
      });

      Toast.show({
        type: "success",
        text1: t("passwordChanged") ?? "Password updated successfully ✅",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      router.back();
    } catch (err: any) {
      const message =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        t("somethingWrong") ??
        "Something went wrong";
      Toast.show({
        type: "error",
        text1: t("error") ?? "Error",
        text2: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-primary">
          {t("changePassword") ?? "Change Password"}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Icon décoratif */}
        <View className="items-center mb-8">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: COLORS.primary + "15" }}
          >
            <Ionicons
              name="lock-closed-outline"
              size={36}
              color={COLORS.primary}
            />
          </View>
          <Text className="text-secondary text-center text-sm px-6">
            {t("changePasswordSubtitle") ??
              "Your new password must be at least 8 characters long."}
          </Text>
        </View>

        {/* Champs */}
        <PasswordField
          label={t("currentPassword") ?? "Current Password"}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          fieldKey="currentPassword"
          showPasswords={showPasswords}
          toggleShow={toggleShow}
        />

        <PasswordField
          label={t("newPassword") ?? "New Password"}
          value={newPassword}
          onChangeText={setNewPassword}
          fieldKey="newPassword"
          showPasswords={showPasswords}
          toggleShow={toggleShow}
          error={
            !newPasswordLongEnough
              ? t("passwordTooShort") ?? "At least 8 characters"
              : undefined
          }
        />

        <PasswordField
          label={t("confirmPassword") ?? "Confirm New Password"}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          fieldKey="confirmPassword"
          showPasswords={showPasswords}
          toggleShow={toggleShow}
          error={
            !passwordsMatch
              ? t("passwordMismatch") ?? "Passwords do not match"
              : undefined
          }
        />

        {/* Password strength indicator */}
        {newPassword.length > 0 && (
          <View className="mb-6">
            <View className="flex-row gap-2 mb-1">
              {[1, 2, 3, 4].map((level) => {
                const strength =
                  newPassword.length >= 12 &&
                  /[A-Z]/.test(newPassword) &&
                  /[0-9]/.test(newPassword) &&
                  /[^A-Za-z0-9]/.test(newPassword)
                    ? 4
                    : newPassword.length >= 10 && /[A-Z]/.test(newPassword)
                    ? 3
                    : newPassword.length >= 8
                    ? 2
                    : 1;
                return (
                  <View
                    key={level}
                    className="flex-1 h-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        level <= strength
                          ? strength === 1
                            ? "#ef4444"
                            : strength === 2
                            ? "#f97316"
                            : strength === 3
                            ? "#eab308"
                            : "#22c55e"
                          : "#e5e7eb",
                    }}
                  />
                );
              })}
            </View>
            <Text className="text-xs text-secondary">
              {(() => {
                const s =
                  newPassword.length >= 12 &&
                  /[A-Z]/.test(newPassword) &&
                  /[0-9]/.test(newPassword) &&
                  /[^A-Za-z0-9]/.test(newPassword)
                    ? t("strengthStrong") ?? "Strong"
                    : newPassword.length >= 10 && /[A-Z]/.test(newPassword)
                    ? t("strengthGood") ?? "Good"
                    : newPassword.length >= 8
                    ? t("strengthFair") ?? "Fair"
                    : t("strengthWeak") ?? "Weak";
                return s;
              })()}
            </Text>
          </View>
        )}

        {/* Bouton */}
        <Pressable
          className={`w-full py-4 rounded-full items-center mb-8 ${
            !isFormValid || loading ? "bg-gray-300" : "bg-primary"
          }`}
          onPress={onChangePassword}
          disabled={!isFormValid || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">
              {t("saveChanges") ?? "Save Changes"}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}