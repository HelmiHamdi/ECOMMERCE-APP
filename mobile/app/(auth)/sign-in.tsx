import { COLORS } from "@/constants";
import { useSignIn } from "@clerk/clerk-expo";
import type { EmailCodeFactor } from "@clerk/types";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import * as React from "react";
import {
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useLanguage } from "@/context/LanguageContext";

const INK = "#13131A";
const MUTED = "#8D8D96";
const SURFACE = "#F5F5F8";


function Tappable({
    onPress,
    disabled,
    children,
    style,
}: {
    onPress?: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    style?: any;
}) {
    const scale = React.useRef(new Animated.Value(1)).current;
    const animateTo = (v: number) =>
        Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            onPressIn={() => animateTo(0.97)}
            onPressOut={() => animateTo(1)}
        >
            <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
        </Pressable>
    );
}

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
    const [focusedField, setFocusedField] = React.useState<"email" | "password" | null>(null);

  
    const headerAnim = React.useRef(new Animated.Value(0)).current;
    const formAnim = React.useRef(new Animated.Value(0)).current;
    const glowPulse = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.sequence([
            Animated.timing(headerAnim, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(formAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(glowPulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(glowPulse, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const glowScale = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
    const glowOpacity = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.9] });

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

    const canSubmit = !loading && !!emailAddress && !!password;

    return (
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingBottom: 24 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {!showEmailCode ? (
                        <>
                           
                            <View className="flex-row items-center justify-between pt-4 pb-2">
                                <TouchableOpacity
                                    onPress={() => router.push("/")}
                                    className="w-11 h-11 rounded-full items-center justify-center "
                                    style={{ backgroundColor: SURFACE }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="arrow-back" size={20} color={INK}/>
                                </TouchableOpacity>
                            </View>

                 
                            <Animated.View
                                style={{
                                    alignItems: "center",
                                    marginTop: 20,
                                    marginBottom: 36,
                                    opacity: headerAnim,
                                    transform: [
                                        { translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
                                    ],
                                }}
                            >
                                <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
                                    <Animated.View
                                        style={{
                                            position: "absolute",
                                            width: 96,
                                            height: 96,
                                            borderRadius: 48,
                                            backgroundColor: `${COLORS.primary}1F`,
                                            opacity: glowOpacity,
                                            transform: [{ scale: glowScale }],
                                        }}
                                    />
                                    <View
                                        style={{
                                            position: "absolute",
                                            width: 68,
                                            height: 68,
                                            borderRadius: 34,
                                            backgroundColor: `${COLORS.primary}12`,
                                        }}
                                    />
                                    <View
                                        style={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 18,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            backgroundColor: COLORS.primary,
                                            shadowColor: COLORS.primary,
                                            shadowOpacity: 0.35,
                                            shadowRadius: 14,
                                            shadowOffset: { width: 0, height: 8 },
                                            elevation: 6,
                                        }}
                                    >
                                        <Ionicons name="lock-open-outline" size={24} color="#fff" />
                                    </View>
                                </View>

                                <Text
                                    className="text-[30px] font-bold text-center"
                                    style={{ color: INK, letterSpacing: -0.6 }}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                >
                                    {t("welcomeBack")}
                                </Text>
                                <Text className="text-[15px] mt-2 text-center" style={{ color: MUTED }}>
                                    {t("signInSubtitle")}
                                </Text>
                            </Animated.View>

                           
                            <Animated.View
                                style={{
                                    opacity: formAnim,
                                    transform: [
                                        { translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
                                    ],
                                }}
                            >
                              
                                <View className="mb-4">
                                    <Text className="text-[13px] font-semibold mb-2 ml-1" style={{ color: "#4A4A4F" }}>
                                        {t("email")}
                                    </Text>
                                    <View
                                        className="w-full flex-row items-center rounded-2xl px-4"
                                        style={{
                                            backgroundColor: SURFACE,
                                            borderWidth: 1.5,
                                            borderColor: focusedField === "email" ? COLORS.primary : "transparent",
                                        }}
                                    >
                                        <Ionicons name="mail-outline" size={18} color="#A0A0A8" />
                                        <TextInput
                                            className="flex-1 py-4 px-3"
                                            style={{ color: INK, fontSize: 15 }}
                                            placeholder="user@example.com"
                                            placeholderTextColor="#ABABB2"
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            value={emailAddress}
                                            onChangeText={setEmailAddress}
                                            onFocus={() => setFocusedField("email")}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                    </View>
                                </View>

                              
                                <View className="mb-3">
                                    <Text className="text-[13px] font-semibold mb-2 ml-1" style={{ color: "#4A4A4F" }}>
                                        {t("password")}
                                    </Text>
                                    <View
                                        className="w-full flex-row items-center rounded-2xl px-4"
                                        style={{
                                            backgroundColor: SURFACE,
                                            borderWidth: 1.5,
                                            borderColor: focusedField === "password" ? COLORS.primary : "transparent",
                                        }}
                                    >
                                        <Ionicons name="lock-closed-outline" size={18} color="#A0A0A8" />
                                        <TextInput
                                            className="flex-1 py-4 px-3"
                                            style={{ color: INK, fontSize: 15 }}
                                            placeholder="********"
                                            placeholderTextColor="#ABABB2"
                                            secureTextEntry={!showPassword}
                                            value={password}
                                            onChangeText={setPassword}
                                            onFocus={() => setFocusedField("password")}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                                            <Ionicons
                                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                                size={19}
                                                color="#A0A0A8"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <Link href="/forgot-password" asChild>
                                    <TouchableOpacity className="self-end mb-8 py-1">
                                        <Text className="font-semibold text-[13px]" style={{ color: COLORS.primary }}>
                                            {t("forgotPassword")}
                                        </Text>
                                    </TouchableOpacity>
                                </Link>

                                <Tappable onPress={onSignInPress} disabled={!canSubmit}>
                                    <View style={{ borderRadius: 999, overflow: "hidden" }}>
                                        {canSubmit ? (
                                            <View
                                                style={{
                                                    width: "100%",
                                                    paddingVertical: 17,
                                                    alignItems: "center",
                                                    backgroundColor: COLORS.primary,
                                                    shadowColor: COLORS.primary,
                                                    shadowOpacity: 0.3,
                                                    shadowRadius: 14,
                                                    shadowOffset: { width: 0, height: 8 },
                                                    elevation: 5,
                                                }}
                                            >
                                                <Text className="font-bold text-[16px] text-white">{t("signIn")}</Text>
                                            </View>
                                        ) : (
                                            <View
                                                style={{
                                                    width: "100%",
                                                    paddingVertical: 17,
                                                    alignItems: "center",
                                                    backgroundColor: "#EDEDF0",
                                                }}
                                            >
                                                <Text className="font-bold text-[16px]" style={{ color: "#B7B7BE" }}>
                                                    {t("signIn")}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </Tappable>

                                <View className="flex-row justify-center mt-8">
                                    <Text className="text-[14px]" style={{ color: MUTED }}>{t("noAccount")} </Text>
                                    <Link href="/sign-up">
                                        <Text className="font-bold text-[14px]" style={{ color: COLORS.primary }}>
                                            {t("signUp")}
                                        </Text>
                                    </Link>
                                </View>
                            </Animated.View>
                        </>
                    ) : (
                        <>
                            <View className="items-center mt-16 mb-10">
                                <View style={{ width: 88, height: 88, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                                    <View
                                        style={{
                                            position: "absolute",
                                            width: 88,
                                            height: 88,
                                            borderRadius: 44,
                                            backgroundColor: `${COLORS.primary}14`,
                                        }}
                                    />
                                    <View
                                        style={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 18,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            backgroundColor: COLORS.primary,
                                            shadowColor: COLORS.primary,
                                            shadowOpacity: 0.35,
                                            shadowRadius: 14,
                                            shadowOffset: { width: 0, height: 8 },
                                            elevation: 6,
                                        }}
                                    >
                                        <Ionicons name="mail-open-outline" size={24} color="#fff" />
                                    </View>
                                </View>
                                <Text className="text-[26px] font-bold text-center" style={{ color: INK, letterSpacing: -0.5 }}>
                                    {t("verifyEmail")}
                                </Text>
                                <Text className="text-[15px] mt-2 text-center px-4" style={{ color: MUTED }}>
                                    {t("verifyEmailSubtitle")}
                                </Text>
                            </View>

                            <View className="mb-8">
                                <TextInput
                                    className="w-full rounded-2xl text-center"
                                    style={{
                                        backgroundColor: SURFACE,
                                        color: INK,
                                        paddingVertical: 18,
                                        fontSize: 24,
                                        letterSpacing: 10,
                                        fontWeight: "600",
                                    }}
                                    placeholder="123456"
                                    placeholderTextColor="#C9C9CF"
                                    keyboardType="number-pad"
                                    value={code}
                                    onChangeText={setCode}
                                    maxLength={6}
                                />
                            </View>

                            <Tappable onPress={onVerifyPress} disabled={loading}>
                                <View
                                    style={{
                                        width: "100%",
                                        paddingVertical: 17,
                                        borderRadius: 999,
                                        alignItems: "center",
                                        backgroundColor: COLORS.primary,
                                        shadowColor: COLORS.primary,
                                        shadowOpacity: 0.3,
                                        shadowRadius: 14,
                                        shadowOffset: { width: 0, height: 8 },
                                        elevation: 5,
                                    }}
                                >
                                    <Text className="text-white font-bold text-[16px]">{t("verify")}</Text>
                                </View>
                            </Tappable>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}