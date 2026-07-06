import { COLORS } from "@/constants";
import { useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as React from "react";
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


function PrimaryButton({
    label,
    onPress,
    disabled,
    loading,
}: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
}) {
    const active = !disabled && !loading;
    return (
        <Tappable onPress={onPress} disabled={disabled || loading}>
            <View
                style={{
                    width: "100%",
                    paddingVertical: 17,
                    borderRadius: 999,
                    alignItems: "center",
                    backgroundColor: active ? COLORS.primary : "#EDEDF0",
                    shadowColor: COLORS.primary,
                    shadowOpacity: active ? 0.3 : 0,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: active ? 5 : 0,
                }}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text className="font-bold text-[16px]" style={{ color: active ? "#fff" : "#B7B7BE" }}>
                        {label}
                    </Text>
                )}
            </View>
        </Tappable>
    );
}

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
    const [focusedField, setFocusedField] = React.useState<"email" | "code" | "password" | null>(null);

 
    const headerAnim = React.useRef(new Animated.Value(0)).current;
    const formAnim = React.useRef(new Animated.Value(0)).current;
    const glowPulse = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        headerAnim.setValue(0);
        formAnim.setValue(0);
        Animated.sequence([
            Animated.timing(headerAnim, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(formAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
    }, [successfulCreation]);

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowPulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(glowPulse, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        ).start();
    }, []);

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
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingBottom: 24 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                  
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

                    {!successfulCreation ? (
                        <>
                           
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
                                <GlowBadge icon="key-outline" pulse={glowPulse} />
                                <Text
                                    className="text-[28px] font-bold text-center"
                                    style={{ color: INK, letterSpacing: -0.5 }}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                >
                                    {t("forgotPasswordTitle")}
                                </Text>
                                <Text className="text-[15px] mt-2 text-center px-2" style={{ color: MUTED }}>
                                    {t("forgotPasswordSubtitle")}
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

                                <View style={{ marginTop: 8 }}>
                                    <PrimaryButton
                                        label={t("sendCode")}
                                        onPress={onRequestReset}
                                        disabled={!emailAddress}
                                        loading={loading}
                                    />
                                </View>
                            </Animated.View>
                        </>
                    ) : (
                        <>
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
                                <GlowBadge icon="lock-closed-outline" pulse={glowPulse} />
                                <Text
                                    className="text-[28px] font-bold text-center"
                                    style={{ color: INK, letterSpacing: -0.5 }}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                >
                                    {t("resetPasswordTitle")}
                                </Text>
                                <Text className="text-[15px] mt-2 text-center px-2" style={{ color: MUTED }}>
                                    {t("resetPasswordSubtitle")}
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
                                <View className="mb-1">
                                    <Text className="text-[13px] font-semibold mb-2 ml-1" style={{ color: "#4A4A4F" }}>
                                        {t("verificationCode")}
                                    </Text>
                                    <TextInput
                                        className="w-full rounded-2xl text-center"
                                        style={{
                                            backgroundColor: SURFACE,
                                            color: INK,
                                            paddingVertical: 18,
                                            fontSize: 22,
                                            letterSpacing: 10,
                                            fontWeight: "600",
                                            borderWidth: 1.5,
                                            borderColor: focusedField === "code" ? COLORS.primary : "transparent",
                                        }}
                                        placeholder="123456"
                                        placeholderTextColor="#C9C9CF"
                                        keyboardType="number-pad"
                                        value={code}
                                        onChangeText={setCode}
                                        maxLength={6}
                                        onFocus={() => setFocusedField("code")}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </View>

                                <View style={{ marginTop: 20 }}>
                                    <FieldInput
                                        label={t("newPassword")}
                                        icon="lock-closed-outline"
                                        placeholder="********"
                                        secureTextEntry={!showPassword}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        focused={focusedField === "password"}
                                        onFocus={() => setFocusedField("password")}
                                        onBlur={() => setFocusedField(null)}
                                        rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                                        onRightIconPress={() => setShowPassword(!showPassword)}
                                    />
                                </View>

                                <View style={{ marginTop: 8 }}>
                                    <PrimaryButton
                                        label={t("resetPasswordTitle")}
                                        onPress={onResetPassword}
                                        disabled={!code || !newPassword}
                                        loading={loading}
                                    />
                                </View>

                                <TouchableOpacity onPress={onRequestReset} disabled={loading} className="mt-6 py-1">
                                    <Text className="text-center font-semibold text-[13px]" style={{ color: COLORS.primary }}>
                                        {t("resendCode")}
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}