import { COLORS } from "@/constants";
import { useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as React from "react";
import { Pressable, TextInput, View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useLanguage } from "@/context/LanguageContext";

export default function ForgotPasswordScreen() {
    const { signIn, setActive, isLoaded } = useSignIn();
    const router = useRouter();
    const { t } = useLanguage();

    const [emailAddress, setEmailAddress] = React.useState("");
    const [code, setCode] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [showPassword, setShowPassword] = React.useState(false);
    const [successfulCreation, setSuccessfulCreation] = React.useState(false);
    const [loading, setLoading] = React.useState(false);

    const onRequestReset = async () => {
        if (!isLoaded) return;
        if (!emailAddress) {
            Toast.show({
                type: "error",
                text1: t("emailRequired"),
                text2: t("enterEmail"),
            });
            return;
        }
        setLoading(true);
        try {
            await signIn.create({
                strategy: "reset_password_email_code",
                identifier: emailAddress,
            });
            setSuccessfulCreation(true);
            Toast.show({
                type: "success",
                text1: t("codeSent"),
                text2: t("checkEmail"),
            });
        } catch (err: any) {
            Toast.show({
                type: "error",
                text1: t("error"),
                text2: err?.errors?.[0]?.message ?? t("somethingWrong"),
            });
        } finally {
            setLoading(false);
        }
    };

    const onResetPassword = async () => {
        if (!isLoaded) return;
        if (!code || !newPassword) {
            Toast.show({
                type: "error",
                text1: t("missingFields"),
                text2: t("fillAllFields"),
            });
            return;
        }
        setLoading(true);
        try {
            const result = await signIn.attemptFirstFactor({
                strategy: "reset_password_email_code",
                code,
                password: newPassword,
            });
            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                Toast.show({
                    type: "success",
                    text1: t("passwordResetSuccess"),
                });
                router.replace("/");
            } else {
                Toast.show({
                    type: "error",
                    text1: t("incompleteReset"),
                });
            }
        } catch (err: any) {
            Toast.show({
                type: "error",
                text1: t("invalidCode"),
                text2: err?.errors?.[0]?.message ?? t("tryAgain"),
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white justify-center" style={{ padding: 28 }}>
            <TouchableOpacity onPress={() => router.back()} className="absolute top-12 z-10">
                <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>

            {!successfulCreation ? (
                <>
                    <View className="items-center mb-8">
                        <Text className="text-3xl font-bold text-primary mb-2">
                            {t("forgotPasswordTitle")}
                        </Text>
                        <Text className="text-secondary text-center">
                            {t("forgotPasswordSubtitle")}
                        </Text>
                    </View>

                    <View className="mb-6">
                        <Text className="text-primary font-medium mb-2">{t("email")}</Text>
                        <TextInput
                            className="w-full bg-surface p-4 rounded-xl text-primary"
                            placeholder="user@example.com"
                            placeholderTextColor="#999"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            value={emailAddress}
                            onChangeText={setEmailAddress}
                        />
                    </View>

                    <Pressable
                        className={`w-full py-4 rounded-full items-center mb-6 ${loading || !emailAddress ? "bg-gray-300" : "bg-primary"}`}
                        onPress={onRequestReset}
                        disabled={loading || !emailAddress}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text className="text-white font-bold text-lg">{t("sendCode")}</Text>
                        }
                    </Pressable>
                </>
            ) : (
                <>
                    <View className="items-center mb-8">
                        <Text className="text-3xl font-bold text-primary mb-2">
                            {t("resetPasswordTitle")}
                        </Text>
                        <Text className="text-secondary text-center">
                            {t("resetPasswordSubtitle")}
                        </Text>
                    </View>

                    <View className="mb-4">
                        <Text className="text-primary font-medium mb-2">{t("verificationCode")}</Text>
                        <TextInput
                            className="w-full bg-surface p-4 rounded-xl text-primary text-center tracking-widest"
                            placeholder="123456"
                            placeholderTextColor="#999"
                            keyboardType="number-pad"
                            value={code}
                            onChangeText={setCode}
                        />
                    </View>

                    <View className="mb-6">
                        <Text className="text-primary font-medium mb-2">{t("newPassword")}</Text>
                        <View className="relative">
                            <TextInput
                                className="w-full bg-surface p-4 pr-12 rounded-xl text-primary"
                                placeholder="********"
                                placeholderTextColor="#999"
                                secureTextEntry={!showPassword}
                                value={newPassword}
                                onChangeText={setNewPassword}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-0 bottom-0 justify-center"
                            >
                                <Ionicons
                                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                                    size={22}
                                    color={COLORS.secondary}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Pressable
                        className={`w-full py-4 rounded-full items-center mb-6 ${loading || !code || !newPassword ? "bg-gray-300" : "bg-primary"}`}
                        onPress={onResetPassword}
                        disabled={loading || !code || !newPassword}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text className="text-white font-bold text-lg">{t("resetPasswordTitle")}</Text>
                        }
                    </Pressable>

                    <TouchableOpacity onPress={onRequestReset} disabled={loading}>
                        <Text className="text-primary text-center font-medium">{t("resendCode")}</Text>
                    </TouchableOpacity>
                </>
            )}
        </SafeAreaView>
    );
}