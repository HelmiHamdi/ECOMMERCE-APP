import { COLORS } from "@/constants";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as React from "react";
import {
    ActivityIndicator,
    Animated,
    Easing,
    Image,
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
import api from "@/constants/api";

const INK = "#13131A";
const MUTED = "#8D8D96";
const SURFACE = "#F5F5F8";

type FieldKey = "firstName" | "lastName" | "phone";


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


function AvatarGlow({
    imageUri,
    pulse,
    onPress,
}: {
    imageUri: string | null;
    pulse: Animated.Value;
    onPress: () => void;
}) {
    const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
    const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.9] });

    return (
        <Tappable onPress={onPress}>
            <View style={{ width: 128, height: 128, alignItems: "center", justifyContent: "center" }}>
                <Animated.View
                    style={{
                        position: "absolute",
                        width: 128,
                        height: 128,
                        borderRadius: 64,
                        backgroundColor: `${COLORS.primary}1F`,
                        opacity: glowOpacity,
                        transform: [{ scale: glowScale }],
                    }}
                />
                <View
                    style={{
                        position: "absolute",
                        width: 116,
                        height: 116,
                        borderRadius: 58,
                        backgroundColor: `${COLORS.primary}12`,
                    }}
                />
                <View
                    style={{
                        width: 104,
                        height: 104,
                        borderRadius: 52,
                        overflow: "hidden",
                        backgroundColor: SURFACE,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 3,
                        borderColor: "#fff",
                        shadowColor: INK,
                        shadowOpacity: 0.12,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 4,
                    }}
                >
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%" }} />
                    ) : (
                        <Ionicons name="person" size={44} color="#B7B7BE" />
                    )}
                </View>
                <View
                    style={{
                        position: "absolute",
                        bottom: 2,
                        right: 2,
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: COLORS.primary,
                        borderWidth: 2.5,
                        borderColor: "#fff",
                        shadowColor: COLORS.primary,
                        shadowOpacity: 0.35,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 5,
                    }}
                >
                    <Ionicons name="camera" size={15} color="#fff" />
                </View>
            </View>
        </Tappable>
    );
}


const InputField = ({
    label,
    value,
    onChangeText,
    fieldKey,
    icon,
    placeholder,
    keyboardType,
    readOnly,
    hint,
    focusedField,
    setFocusedField,
}: {
    label: string;
    value: string;
    onChangeText?: (v: string) => void;
    fieldKey: FieldKey | "email";
    icon: keyof typeof Ionicons.glyphMap;
    placeholder?: string;
    keyboardType?: "default" | "phone-pad";
    readOnly?: boolean;
    hint?: string;
    focusedField: string | null;
    setFocusedField: (f: string | null) => void;
}) => {
    const focused = focusedField === fieldKey;
    const borderColor = readOnly ? "transparent" : focused ? COLORS.primary : "transparent";

    return (
        <View className="mb-4">
            <Text className="text-[13px] font-semibold mb-2 ml-1" style={{ color: "#4A4A4F" }}>
                {label}
            </Text>
            <View
                className="w-full flex-row items-center rounded-2xl px-4"
                style={{
                    backgroundColor: readOnly ? "#EFEFF2" : SURFACE,
                    borderWidth: 1.5,
                    borderColor,
                }}
            >
                <Ionicons name={icon} size={18} color="#A0A0A8" />
                {readOnly ? (
                    <Text className="flex-1 py-4 px-3" style={{ color: MUTED, fontSize: 15 }}>
                        {value}
                    </Text>
                ) : (
                    <TextInput
                        className="flex-1 py-4 px-3"
                        style={{ color: INK, fontSize: 15 }}
                        placeholder={placeholder}
                        placeholderTextColor="#ABABB2"
                        keyboardType={keyboardType ?? "default"}
                        value={value}
                        onChangeText={onChangeText}
                        onFocus={() => setFocusedField(fieldKey)}
                        onBlur={() => setFocusedField(null)}
                    />
                )}
                {readOnly && <Ionicons name="lock-closed" size={14} color="#B7B7BE" />}
            </View>
            {hint ? (
                <Text className="text-[12px] mt-1.5 ml-1" style={{ color: MUTED }}>
                    {hint}
                </Text>
            ) : null}
        </View>
    );
};

export default function EditProfileScreen() {
    const router = useRouter();
    const { t } = useLanguage();
    const { getToken } = useAuth();
    const { user } = useUser();

    const [firstName, setFirstName] = React.useState("");
    const [lastName, setLastName] = React.useState("");
    const [phone, setPhone] = React.useState("");
    const [email, setEmail] = React.useState("");
    const [imageUri, setImageUri] = React.useState<string | null>(null);
    const [imageChanged, setImageChanged] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [fetching, setFetching] = React.useState(true);
    const [focusedField, setFocusedField] = React.useState<string | null>(null);

   
    const headerAnim = React.useRef(new Animated.Value(0)).current;
    const formAnim = React.useRef(new Animated.Value(0)).current;
    const glowPulse = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        loadProfile();

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
            router.push("/settings");
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
            <SafeAreaView className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
               
                <View className="flex-row items-center px-6 pt-2 pb-3">
                    <TouchableOpacity
                        onPress={() => router.push("/settings")}
                        className="w-11 h-11 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: SURFACE }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={20} color={INK} />
                    </TouchableOpacity>
                    <Text className="text-[17px] font-bold" style={{ color: INK }}>
                        {t("editProfile") ?? "Edit Profile"}
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
                        <AvatarGlow imageUri={imageUri} pulse={glowPulse} onPress={pickImage} />
                        <Text className="text-[14px] text-center px-6 mt-3" style={{ color: MUTED }}>
                            {t("changePhoto") ?? "Tap to change your photo"}
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
                        <View className="flex-row" style={{ gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <InputField
                                    label={t("firstName") ?? "First Name"}
                                    value={firstName}
                                    onChangeText={setFirstName}
                                    fieldKey="firstName"
                                    icon="person-outline"
                                    placeholder="John"
                                    focusedField={focusedField}
                                    setFocusedField={setFocusedField}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <InputField
                                    label={t("lastName") ?? "Last Name"}
                                    value={lastName}
                                    onChangeText={setLastName}
                                    fieldKey="lastName"
                                    icon="person-outline"
                                    placeholder="Doe"
                                    focusedField={focusedField}
                                    setFocusedField={setFocusedField}
                                />
                            </View>
                        </View>

                        <InputField
                            label={t("email") ?? "Email"}
                            value={email}
                            fieldKey="email"
                            icon="mail-outline"
                            readOnly
                            hint={t("emailCannotBeChanged") ?? "Your email can't be changed"}
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}
                        />

                        <InputField
                            label={t("phone") ?? "Phone"}
                            value={phone}
                            onChangeText={setPhone}
                            fieldKey="phone"
                            icon="call-outline"
                            placeholder="+216 00 000 000"
                            keyboardType="phone-pad"
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}
                        />

                        <Tappable onPress={onSave} disabled={loading}>
                            <View
                                style={{
                                    width: "100%",
                                    paddingVertical: 17,
                                    borderRadius: 999,
                                    alignItems: "center",
                                    marginTop: 8,
                                    backgroundColor: !loading ? COLORS.primary : "#EDEDF0",
                                    shadowColor: COLORS.primary,
                                    shadowOpacity: !loading ? 0.3 : 0,
                                    shadowRadius: 14,
                                    shadowOffset: { width: 0, height: 8 },
                                    elevation: !loading ? 5 : 0,
                                }}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="font-bold text-[16px]" style={{ color: "#fff" }}>
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