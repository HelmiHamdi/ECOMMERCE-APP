import { COLORS } from "@/constants";
import { useSignIn } from "@clerk/clerk-expo";
import type { EmailCodeFactor } from "@clerk/types";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import * as React from "react";
import { Pressable, TextInput, View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useLanguage } from "@/context/LanguageContext";

export default function Page() {
    const { signIn, setActive, isLoaded } = useSignIn();
    const router = useRouter();
    const { t } = useLanguage();

    const [emailAddress, setEmailAddress] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [code, setCode] = React.useState("");
    const [showEmailCode, setShowEmailCode] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);

    const onSignInPress = async () => {
        if (!isLoaded) return;
        if (!emailAddress || !password) return;
        setLoading(true);
        try {
            const signInAttempt = await signIn.create({
                identifier: emailAddress,
                password,
            });
            if (signInAttempt.status === "complete") {
                await setActive({ session: signInAttempt.createdSessionId });
                router.replace("/");
            } else if (signInAttempt.status === "needs_second_factor") {
                const emailCodeFactor = signInAttempt.supportedSecondFactors?.find(
                    (factor): factor is EmailCodeFactor => factor.strategy === "email_code"
                );
                if (emailCodeFactor) {
                    await signIn.prepareSecondFactor({
                        strategy: "email_code",
                        emailAddressId: emailCodeFactor.emailAddressId,
                    });
                    setShowEmailCode(true);
                }
            }
        } catch (err: any) {
            Toast.show({
                type: "error",
                text1: t("signInFailed"),
                text2: err?.errors?.[0]?.message ?? t("somethingWrong"),
            });
        } finally {
            setLoading(false);
        }
    };

    const onVerifyPress = async () => {
        if (!isLoaded || !code) return;
        setLoading(true);
        try {
            const attempt = await signIn.attemptSecondFactor({
                strategy: "email_code",
                code,
            });
            if (attempt.status === "complete") {
                await setActive({ session: attempt.createdSessionId });
                router.replace("/");
            }
        } catch (err: any) {
            Toast.show({
                type: "error",
                text1: t("verificationFailed"),
                text2: err?.errors?.[0]?.message ?? t("invalidCode"),
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white justify-center" style={{ padding: 28 }}>
            {!showEmailCode ? (
                <>
                    <TouchableOpacity onPress={() => router.push("/")} className="absolute top-12 z-10">
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>

                    <View className="items-center mb-8">
                        <Text className="text-3xl font-bold text-primary mb-2" numberOfLines={1} adjustsFontSizeToFit>
                            {t("welcomeBack")}
                        </Text>
                        <Text className="text-secondary">{t("signInSubtitle")}</Text>
                    </View>

                    <View className="mb-4">
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

                    <View className="mb-6">
                        <Text className="text-primary font-medium mb-2">{t("password")}</Text>
                        <View className="relative">
                            <TextInput
                                className="w-full bg-surface p-4 pr-12 rounded-xl text-primary"
                                placeholder="********"
                                placeholderTextColor="#999"
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
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

                    <Link href="/forgot-password" asChild>
                        <TouchableOpacity className="self-end mb-6">
                            <Text className="text-primary font-medium">{t("forgotPassword")}</Text>
                        </TouchableOpacity>
                    </Link>

                    <Pressable
                        className={`w-full py-4 rounded-full items-center mb-10 ${loading || !emailAddress || !password ? "bg-gray-300" : "bg-primary"}`}
                        onPress={onSignInPress}
                        disabled={loading || !emailAddress || !password}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text className="text-white font-bold text-lg">{t("signIn")}</Text>
                        }
                    </Pressable>

                    <View className="flex-row justify-center">
                        <Text className="text-secondary">{t("noAccount")}</Text>
                        <Link href="/sign-up">
                            <Text className="text-primary font-bold">{t("signUp")}</Text>
                        </Link>
                    </View>
                </>
            ) : (
                <>
                    <View className="items-center mb-8">
                        <Text className="text-3xl font-bold text-primary mb-2">{t("verifyEmail")}</Text>
                        <Text className="text-secondary text-center">{t("verifyEmailSubtitle")}</Text>
                    </View>

                    <View className="mb-6">
                        <TextInput
                            className="w-full bg-surface p-4 rounded-xl text-primary text-center tracking-widest"
                            placeholder="123456"
                            placeholderTextColor="#999"
                            keyboardType="number-pad"
                            value={code}
                            onChangeText={setCode}
                        />
                    </View>

                    <Pressable
                        className="w-full bg-primary py-4 rounded-full items-center"
                        onPress={onVerifyPress}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text className="text-white font-bold text-lg">{t("verify")}</Text>
                        }
                    </Pressable>
                </>
            )}
        </SafeAreaView>
    );
}