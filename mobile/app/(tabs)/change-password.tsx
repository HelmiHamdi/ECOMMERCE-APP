import { COLORS } from "@/constants";
import { useUser } from "@clerk/clerk-expo";
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

type FieldKey = "currentPassword" | "newPassword" | "confirmPassword";


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
        <Pressable onPress={onPress} disabled={disabled} onPressIn={() => animateTo(0.97)} onPressOut={() => animateTo(1)}>
            <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
        </Pressable>
    );
}


function GlowBadge({ icon, pulse }: { icon: keyof typeof Ionicons.glyphMap; pulse: Animated.Value }) {
    const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
    const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.9] });

    return (
        <View style={{ width: 88, height: 88, alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <Animated.View
                style={{
                    position: "absolute",
                    width: 88,
                    height: 88,
                    borderRadius: 44,
                    backgroundColor: `${COLORS.primary}1F`,
                    opacity: glowOpacity,
                    transform: [{ scale: glowScale }],
                }}
            />
            <View
                style={{
                    position: "absolute",
                    width: 62,
                    height: 62,
                    borderRadius: 31,
                    backgroundColor: `${COLORS.primary}12`,
                }}
            />
            <View
                style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
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
                <Ionicons name={icon} size={22} color="#fff" />
            </View>
        </View>
    );
}


const PasswordField = ({
    label,
    value,
    onChangeText,
    fieldKey,
    error,
    showPasswords,
    toggleShow,
    focusedField,
    setFocusedField,
}: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    fieldKey: FieldKey;
    error?: string;
    showPasswords: Record<FieldKey, boolean>;
    toggleShow: (field: FieldKey) => void;
    focusedField: FieldKey | null;
    setFocusedField: (f: FieldKey | null) => void;
}) => {
    const focused = focusedField === fieldKey;
    const borderColor = error ? "#EF4444" : focused ? COLORS.primary : "transparent";

    return (
        <View className="mb-4">
            <Text className="text-[13px] font-semibold mb-2 ml-1" style={{ color: "#4A4A4F" }}>
                {label}
            </Text>
            <View
                className="w-full flex-row items-center rounded-2xl px-4"
                style={{ backgroundColor: SURFACE, borderWidth: 1.5, borderColor }}
            >
                <Ionicons name="lock-closed-outline" size={18} color="#A0A0A8" />
                <TextInput
                    className="flex-1 py-4 px-3"
                    style={{ color: INK, fontSize: 15 }}
                    placeholder="••••••••"
                    placeholderTextColor="#ABABB2"
                    secureTextEntry={!showPasswords[fieldKey]}
                    value={value}
                    onChangeText={onChangeText}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setFocusedField(fieldKey)}
                    onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => toggleShow(fieldKey)} hitSlop={8}>
                    <Ionicons
                        name={showPasswords[fieldKey] ? "eye-off-outline" : "eye-outline"}
                        size={19}
                        color="#A0A0A8"
                    />
                </TouchableOpacity>
            </View>
            {error ? (
                <Text className="text-[12px] mt-1.5 ml-1" style={{ color: "#EF4444" }}>
                    {error}
                </Text>
            ) : null}
        </View>
    );
};

export default function ChangePasswordScreen() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const { t } = useLanguage();

    const [currentPassword, setCurrentPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [focusedField, setFocusedField] = React.useState<FieldKey | null>(null);

    const [showPasswords, setShowPasswords] = React.useState<Record<FieldKey, boolean>>({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
    });

    const toggleShow = (field: FieldKey) => {
        setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    
    const headerAnim = React.useRef(new Animated.Value(0)).current;
    const formAnim = React.useRef(new Animated.Value(0)).current;
    const glowPulse = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.sequence([
            Animated.timing(headerAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(formAnim, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(glowPulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(glowPulse, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const passwordsMatch = confirmPassword.length === 0 || newPassword === confirmPassword;
    const newPasswordLongEnough = newPassword.length === 0 || newPassword.length >= 8;
    const isFormValid =
        currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

    const strength = React.useMemo(() => {
        if (newPassword.length === 0) return 0;
        if (
            newPassword.length >= 12 &&
            /[A-Z]/.test(newPassword) &&
            /[0-9]/.test(newPassword) &&
            /[^A-Za-z0-9]/.test(newPassword)
        )
            return 4;
        if (newPassword.length >= 10 && /[A-Z]/.test(newPassword)) return 3;
        if (newPassword.length >= 8) return 2;
        return 1;
    }, [newPassword]);

    const strengthColor = ["#e5e7eb", "#EF4444", "#F97316", "#EAB308", "#22C55E"][strength];
    const strengthLabel = [
        "",
        t("strengthWeak") ?? "Weak",
        t("strengthFair") ?? "Fair",
        t("strengthGood") ?? "Good",
        t("strengthStrong") ?? "Strong",
    ][strength];

    const onChangePassword = async () => {
        if (!isLoaded || !user) return;

        if (newPassword !== confirmPassword) {
            Toast.show({ type: "error", text1: t("passwordMismatch") ?? "Passwords do not match" });
            return;
        }
        if (newPassword.length < 8) {
            Toast.show({
                type: "error",
                text1: t("passwordTooShort") ?? "Password must be at least 8 characters",
            });
            return;
        }

        setLoading(true);
        try {
            await user.updatePassword({ currentPassword, newPassword });

            Toast.show({
                type: "success",
                text1: t("passwordChanged") ?? "Password updated successfully",
            });

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

           router.push("/profile");
        } catch (err: any) {
            const message =
                err?.errors?.[0]?.longMessage ??
                err?.errors?.[0]?.message ??
                t("somethingWrong") ??
                "Something went wrong";
            Toast.show({ type: "error", text1: t("error") ?? "Error", text2: message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
               
                <View className="flex-row items-center px-6 pt-2 pb-3">
                    <TouchableOpacity
                        onPress={() => router.push("/profile")}
                        className="w-11 h-11 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: SURFACE }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={20} color={INK}/>
                    </TouchableOpacity>
                    <Text className="text-[17px] font-bold" style={{ color: INK }}>
                        {t("changePassword") ?? "Change Password"}
                    </Text>
                </View>

                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 32 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    
                    <Animated.View
                        style={{
                            alignItems: "center",
                            marginTop: 12,
                            marginBottom: 30,
                            opacity: headerAnim,
                            transform: [
                                { translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
                            ],
                        }}
                    >
                        <GlowBadge icon="lock-closed-outline" pulse={glowPulse} />
                        <Text className="text-[14px] text-center px-6" style={{ color: MUTED }}>
                            {t("changePasswordSubtitle") ?? "Your new password must be at least 8 characters long."}
                        </Text>
                    </Animated.View>

                 
                    <Animated.View
                        style={{
                            opacity: formAnim,
                            transform: [
                                { translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
                            ],
                        }}
                    >
                        <PasswordField
                            label={t("currentPassword") ?? "Current Password"}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            fieldKey="currentPassword"
                            showPasswords={showPasswords}
                            toggleShow={toggleShow}
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}
                        />

                        <PasswordField
                            label={t("newPassword") ?? "New Password"}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            fieldKey="newPassword"
                            showPasswords={showPasswords}
                            toggleShow={toggleShow}
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}
                            error={!newPasswordLongEnough ? t("passwordTooShort") ?? "At least 8 characters" : undefined}
                        />

                       
                        {newPassword.length > 0 && (
                            <View className="mb-1" style={{ marginTop: -6 }}>
                                <View className="flex-row mb-1.5" style={{ gap: 6 }}>
                                    {[1, 2, 3, 4].map((level) => (
                                        <View
                                            key={level}
                                            className="flex-1 h-[5px] rounded-full"
                                            style={{ backgroundColor: level <= strength ? strengthColor : "#EDEDF0" }}
                                        />
                                    ))}
                                </View>
                                <Text className="text-[12px] font-medium" style={{ color: strengthColor }}>
                                    {strengthLabel}
                                </Text>
                            </View>
                        )}

                        <View style={{ marginTop: 16 }}>
                            <PasswordField
                                label={t("confirmPassword") ?? "Confirm New Password"}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                fieldKey="confirmPassword"
                                showPasswords={showPasswords}
                                toggleShow={toggleShow}
                                focusedField={focusedField}
                                setFocusedField={setFocusedField}
                                error={!passwordsMatch ? t("passwordMismatch") ?? "Passwords do not match" : undefined}
                            />
                        </View>

                        <Tappable onPress={onChangePassword} disabled={!isFormValid || loading}>
                            <View
                                style={{
                                    width: "100%",
                                    paddingVertical: 17,
                                    borderRadius: 999,
                                    alignItems: "center",
                                    marginTop: 8,
                                    backgroundColor: isFormValid && !loading ? COLORS.primary : "#EDEDF0",
                                    shadowColor: COLORS.primary,
                                    shadowOpacity: isFormValid && !loading ? 0.3 : 0,
                                    shadowRadius: 14,
                                    shadowOffset: { width: 0, height: 8 },
                                    elevation: isFormValid && !loading ? 5 : 0,
                                }}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text
                                        className="font-bold text-[16px]"
                                        style={{ color: isFormValid ? "#fff" : "#B7B7BE" }}
                                    >
                                        {t("saveChanges") ?? "Save Changes"}
                                    </Text>
                                )}
                            </View>
                        </Tappable>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}