import { COLORS } from "@/constants";
import { useSignUp } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import * as React from "react";
import { useState } from "react";
import {
    ActivityIndicator,
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
}: {
    onPress?: () => void;
    disabled?: boolean;
    children: React.ReactNode;
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
            <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
        </Pressable>
    );
}


function FieldInput({
    label,
    icon,
    focused,
    onFocus,
    onBlur,
    rightIcon,
    onRightIconPress,
    ...inputProps
}: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    focused: boolean;
    onFocus: () => void;
    onBlur: () => void;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightIconPress?: () => void;
    [key: string]: any;
}) {
    return (
        <View className="mb-4">
            <Text className="text-[13px] font-semibold mb-2 ml-1" style={{ color: "#4A4A4F" }}>
                {label}
            </Text>
            <View
                className="w-full flex-row items-center rounded-2xl px-4"
                style={{
                    backgroundColor: SURFACE,
                    borderWidth: 1.5,
                    borderColor: focused ? COLORS.primary : "transparent",
                }}
            >
                <Ionicons name={icon} size={18} color="#A0A0A8" />
                <TextInput
                    className="flex-1 py-4 px-3"
                    style={{ color: INK, fontSize: 15 }}
                    placeholderTextColor="#ABABB2"
                    onFocus={onFocus}
                    onBlur={onBlur}
                    {...inputProps}
                />
                {rightIcon && (
                    <TouchableOpacity onPress={onRightIconPress} hitSlop={8}>
                        <Ionicons name={rightIcon} size={19} color="#A0A0A8" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

/** Glowing badge, the shared signature element across auth screens */
function GlowBadge({ icon, pulse }: { icon: keyof typeof Ionicons.glyphMap; pulse: Animated.Value }) {
    const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
    const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.9] });

    return (
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
                <Ionicons name={icon} size={24} color="#fff" />
            </View>
        </View>
    );
}

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
    const [focusedField, setFocusedField] = useState<"first" | "last" | "email" | "password" | null>(null);

    
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

    const onSignUpPress = async () => {
        if (!isLoaded) return;
        if (!emailAddress || !password) {
            Toast.show({
                type: "error",
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
                type: "error",
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
                type: "error",
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
                    type: "error",
                    text1: t("verificationIncomplete"),
                });
            }
        } catch (err: any) {
            Toast.show({
                type: "error",
                text1: t("failedToVerify"),
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
                    {!pendingVerification ? (
                        <>
                            
                            <View className="flex-row items-center justify-between pt-4 pb-2">
                                <TouchableOpacity
                                    onPress={() => router.push("/")}
                                    className="w-11 h-11 rounded-full items-center justify-center"
                                    style={{ backgroundColor: SURFACE }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="arrow-back" size={20} color={INK} />
                                </TouchableOpacity>
                            </View>

                            {/* Signature: glowing badge */}
                            <Animated.View
                                style={{
                                    alignItems: "center",
                                    marginTop: 12,
                                    marginBottom: 28,
                                    opacity: headerAnim,
                                    transform: [
                                        { translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
                                    ],
                                }}
                            >
                                <GlowBadge icon="person-add-outline" pulse={glowPulse} />
                                <Text
                                    className="text-[30px] font-bold text-center"
                                    style={{ color: INK, letterSpacing: -0.6 }}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                >
                                    {t("createAccount")}
                                </Text>
                                <Text className="text-[15px] mt-2 text-center" style={{ color: MUTED }}>
                                    {t("signUpSubtitle")}
                                </Text>
                            </Animated.View>

                            {/* Form */}
                            <Animated.View
                                style={{
                                    opacity: formAnim,
                                    transform: [
                                        { translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
                                    ],
                                }}
                            >
                                <View className="flex-row" style={{ gap: 12 }}>
                                    <View style={{ flex: 1 }}>
                                        <FieldInput
                                            label={t("firstName")}
                                            icon="person-outline"
                                            placeholder="John"
                                            value={firstName}
                                            onChangeText={setFirstName}
                                            focused={focusedField === "first"}
                                            onFocus={() => setFocusedField("first")}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <FieldInput
                                            label={t("lastName")}
                                            icon="person-outline"
                                            placeholder="Doe"
                                            value={lastName}
                                            onChangeText={setLastName}
                                            focused={focusedField === "last"}
                                            onFocus={() => setFocusedField("last")}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                    </View>
                                </View>

                                <FieldInput
                                    label={t("email")}
                                    icon="mail-outline"
                                    placeholder="user@example.com"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    value={emailAddress}
                                    onChangeText={setEmailAddress}
                                    focused={focusedField === "email"}
                                    onFocus={() => setFocusedField("email")}
                                    onBlur={() => setFocusedField(null)}
                                />

                                <FieldInput
                                    label={t("password")}
                                    icon="lock-closed-outline"
                                    placeholder="********"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                    focused={focusedField === "password"}
                                    onFocus={() => setFocusedField("password")}
                                    onBlur={() => setFocusedField(null)}
                                    rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                                    onRightIconPress={() => setShowPassword(!showPassword)}
                                />

                                <Tappable onPress={onSignUpPress} disabled={loading}>
                                    <View
                                        style={{
                                            width: "100%",
                                            paddingVertical: 17,
                                            borderRadius: 999,
                                            alignItems: "center",
                                            marginTop: 8,
                                            backgroundColor: canSubmit ? COLORS.primary : "#EDEDF0",
                                            shadowColor: COLORS.primary,
                                            shadowOpacity: canSubmit ? 0.3 : 0,
                                            shadowRadius: 14,
                                            shadowOffset: { width: 0, height: 8 },
                                            elevation: canSubmit ? 5 : 0,
                                        }}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text
                                                className="font-bold text-[16px]"
                                                style={{ color: canSubmit ? "#fff" : "#B7B7BE" }}
                                            >
                                                {t("continue")}
                                            </Text>
                                        )}
                                    </View>
                                </Tappable>

                                <View className="flex-row justify-center mt-8">
                                    <Text className="text-[14px]" style={{ color: MUTED }}>{t("alreadyHaveAccount")} </Text>
                                    <Link href="/sign-in">
                                        <Text className="font-bold text-[14px]" style={{ color: COLORS.primary }}>
                                            {t("login")}
                                        </Text>
                                    </Link>
                                </View>
                            </Animated.View>
                        </>
                    ) : (
                        <>
                            <View className="flex-row items-center justify-between pt-4 pb-2">
                                <TouchableOpacity
                                    onPress={() => router.back()}
                                    className="w-11 h-11 rounded-full items-center justify-center"
                                    style={{ backgroundColor: SURFACE }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="arrow-back" size={20} color={INK} />
                                </TouchableOpacity>
                            </View>

                            <View className="items-center mt-10 mb-10">
                                <GlowBadge icon="mail-open-outline" pulse={glowPulse} />
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
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text className="text-white font-bold text-[16px]">{t("verify")}</Text>
                                    )}
                                </View>
                            </Tappable>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}