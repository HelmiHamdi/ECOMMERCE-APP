import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from 'react-native-toast-message';
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Link } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { COLORS } from "@/constants";
import { useLanguage } from "@/context/LanguageContext";

export default function SignUpScreen() {
    const { isLoaded, signUp, setActive } = useSignUp();
    const router = useRouter();
    const { t } = useLanguage();

    const [emailAddress, setEmailAddress] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [code, setCode] = useState("");
    const [pendingVerification, setPendingVerification] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const onSignUpPress = async () => {
        if (!isLoaded) return;
        if (!emailAddress || !password) {
            Toast.show({
                type: 'error',
                text1: t("missingFields"),
                text2: t("fillAllFields"),
            });
            return;
        }
        setLoading(true);
        try {
            await signUp.create({ emailAddress, password, firstName, lastName });
            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
            setPendingVerification(true);
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: t("failedToSignUp"),
                text2: err?.errors?.[0]?.message ?? t("somethingWrong"),
            });
        } finally {
            setLoading(false);
        }
    };

    const onVerifyPress = async () => {
        if (!isLoaded) return;
        if (!code) {
            Toast.show({
                type: 'error',
                text1: t("missingFields"),
                text2: t("enterVerificationCode"),
            });
            return;
        }
        setLoading(true);
        try {
            const attempt = await signUp.attemptEmailAddressVerification({ code });
            if (attempt.status === "complete") {
                await setActive({ session: attempt.createdSessionId });
                router.replace("/");
            } else {
                Toast.show({
                    type: 'error',
                    text1: t("verificationIncomplete"),
                });
            }
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: t("failedToVerify"),
                text2: err?.errors?.[0]?.message ?? t("invalidCode"),
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white justify-center" style={{ padding: 28 }}>
            {!pendingVerification ? (
                <>
                    <TouchableOpacity onPress={() => router.push("/")} className="absolute top-12 z-10">
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>

                    <View className="items-center mb-8">
                        <Text className="text-3xl font-bold text-primary mb-2">{t("createAccount")}</Text>
                        <Text className="text-secondary">{t("signUpSubtitle")}</Text>
                    </View>

                    <View className="mb-4">
                        <Text className="text-primary font-medium mb-2">{t("firstName")}</Text>
                        <TextInput
                            className="w-full bg-surface p-4 rounded-xl text-primary"
                            placeholder="John"
                            placeholderTextColor="#999"
                            value={firstName}
                            onChangeText={setFirstName}
                        />
                    </View>

                    <View className="mb-6">
                        <Text className="text-primary font-medium mb-2">{t("lastName")}</Text>
                        <TextInput
                            className="w-full bg-surface p-4 rounded-xl text-primary"
                            placeholder="Doe"
                            placeholderTextColor="#999"
                            value={lastName}
                            onChangeText={setLastName}
                        />
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

                    <TouchableOpacity
                        className="w-full bg-primary py-4 rounded-full items-center mb-10"
                        onPress={onSignUpPress}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text className="text-white font-bold text-lg">{t("continue")}</Text>
                        }
                    </TouchableOpacity>

                    <View className="flex-row justify-center">
                        <Text className="text-secondary">{t("alreadyHaveAccount")}</Text>
                        <Link href="/sign-in">
                            <Text className="text-primary font-bold">{t("login")}</Text>
                        </Link>
                    </View>
                </>
            ) : (
                <>
                    <TouchableOpacity onPress={() => router.back()} className="absolute top-12 z-10">
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>

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

                    <TouchableOpacity
                        className="w-full bg-primary py-4 rounded-full items-center"
                        onPress={onVerifyPress}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text className="text-white font-bold text-lg">{t("verify")}</Text>
                        }
                    </TouchableOpacity>
                </>
            )}
        </SafeAreaView>
    );
}