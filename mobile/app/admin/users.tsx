import { COLORS } from "@/constants";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";

const INK = "#13131A";
const MUTED = "#8D8D96";
const SURFACE = "#F5F5F8";
const BORDER = "#ECECF1";

type AdminUser = {
    _id: string;
    name?: string;
    email: string;
    clerkId?: string;
    image?: string;
    phone?: string;
    role: "user" | "admin";
    wishlist?: string[];
    expoPushToken?: string | null;
    createdAt: string;
    updatedAt?: string;
};

type RoleFilter = "all" | "user" | "admin";

export default function AdminUsersScreen() {
    const { getToken } = useAuth();
    const router = useRouter();
    const { t } = useLanguage();

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

    const ROLE_FILTERS: { key: RoleFilter; label: string }[] = [
        { key: "all", label: t("roleAll") || "Tous" },
        { key: "user", label: t("roleUsers") || "Clients" },
        { key: "admin", label: t("roleAdmins") || "Admins" },
    ];

    const fetchUsers = useCallback(async () => {
        try {
            const token = await getToken();
            const { data } = await api.get("/admin/users", {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    search: search || undefined,
                    role: roleFilter,
                },
            });
            if (data.success) {
                setUsers(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [getToken, search, roleFilter]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setLoading(true);
            fetchUsers();
        }, 300);
        return () => clearTimeout(timeout);
    }, [search, roleFilter]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    return (
        <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
            {/* Désactive le header natif d'expo-router pour ne garder QUE
               la flèche de retour personnalisée ci-dessous. */}
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="flex-row items-center px-4 pt-2 pb-5">
                <TouchableOpacity
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                        backgroundColor: "#fff",
                        borderWidth: 1,
                        borderColor: BORDER,
                        shadowColor: "#000",
                        shadowOpacity: 0.05,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 1,
                    }}
                >
                    <Ionicons name="arrow-back" size={20} color={INK} />
                </TouchableOpacity>

                <View className="flex-1">
                    <Text
                        style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: COLORS.primary,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                        }}
                    >
                        {t("admin") || "Admin"}
                    </Text>
                    <Text
                        style={{
                            fontSize: 26,
                            fontWeight: "800",
                            color: INK,
                            letterSpacing: -0.5,
                            marginTop: 1,
                        }}
                    >
                        {t("users") || "Utilisateurs"}
                    </Text>
                </View>

                {!loading && (
                    <View
                        style={{
                            backgroundColor: "#fff",
                            borderWidth: 1,
                            borderColor: BORDER,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 999,
                        }}
                    >
                        <Text style={{ fontSize: 12, fontWeight: "800", color: MUTED }}>
                            {users.length}
                        </Text>
                    </View>
                )}
            </View>

            {/* Barre de recherche */}
            <View className="px-4 mb-4">
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#fff",
                        borderRadius: 16,
                        paddingHorizontal: 14,
                        height: 52,
                        borderWidth: 1.5,
                        borderColor: searchFocused ? COLORS.primary : BORDER,
                        shadowColor: searchFocused ? COLORS.primary : "#000",
                        shadowOpacity: searchFocused ? 0.15 : 0.04,
                        shadowRadius: searchFocused ? 10 : 6,
                        shadowOffset: { width: 0, height: 3 },
                        elevation: searchFocused ? 3 : 1,
                    }}
                >
                    <View
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 10,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: searchFocused ? `${COLORS.primary}18` : SURFACE,
                            marginRight: 10,
                        }}
                    >
                        <Ionicons
                            name="search-outline"
                            size={17}
                            color={searchFocused ? COLORS.primary : "#9A9AA2"}
                        />
                    </View>
                    <TextInput
                        style={{ flex: 1, color: INK, fontSize: 15, fontWeight: "500" }}
                        placeholder={t("searchUsers") || "Rechercher un nom, un email..."}
                        placeholderTextColor="#ABABB2"
                        value={search}
                        onChangeText={setSearch}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        autoCapitalize="none"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearch("")}
                            hitSlop={8}
                            style={{
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                backgroundColor: "#E8E8EC",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Ionicons name="close" size={14} color="#6B6B72" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filtres par rôle */}
            <View className="flex-row px-4 mb-4" style={{ gap: 8 }}>
                {ROLE_FILTERS.map((f) => {
                    const active = roleFilter === f.key;
                    return (
                        <TouchableOpacity
                            key={f.key}
                            onPress={() => setRoleFilter(f.key)}
                            activeOpacity={0.8}
                            style={{
                                paddingVertical: 9,
                                paddingHorizontal: 18,
                                borderRadius: 999,
                                backgroundColor: active ? COLORS.primary : "#fff",
                                borderWidth: 1.5,
                                borderColor: active ? COLORS.primary : BORDER,
                                shadowColor: COLORS.primary,
                                shadowOpacity: active ? 0.25 : 0,
                                shadowRadius: 8,
                                shadowOffset: { width: 0, height: 4 },
                                elevation: active ? 2 : 0,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 13,
                                    fontWeight: "700",
                                    color: active ? "#fff" : "#6B6B72",
                                }}
                            >
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading && !refreshing ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {users.length === 0 ? (
                        <View
                            className="bg-white p-8 rounded-3xl border border-gray-100 items-center mt-4"
                            style={{
                                shadowColor: "#000",
                                shadowOpacity: 0.03,
                                shadowRadius: 8,
                                shadowOffset: { width: 0, height: 2 },
                                elevation: 1,
                            }}
                        >
                            <View className="w-14 h-14 rounded-full bg-gray-50 items-center justify-center mb-3">
                                <Ionicons name="people-outline" size={26} color="#B0B0B0" />
                            </View>
                            <Text className="text-secondary font-medium">
                                {t("noUsersFound") || "Aucun utilisateur trouvé"}
                            </Text>
                        </View>
                    ) : (
                        users.map((user) => <UserCard key={user._id} user={user} t={t} />)
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const UserCard = ({ user, t }: { user: AdminUser; t: (key: string) => string }) => {
    const initial = (user.name || user.email || "?").charAt(0).toUpperCase();
    const isAdmin = user.role === "admin";
    const wishlistCount = user.wishlist?.length ?? 0;
    const hasPushToken = !!user.expoPushToken;
    const joined = new Date(user.createdAt).toLocaleDateString();
    const wishlistLabel = `${wishlistCount} ${
        wishlistCount > 1
            ? t("wishlistItems") || "articles en liste de souhaits"
            : t("wishlistItem") || "article en liste de souhaits"
    }`;

    return (
        <View
            style={{
                backgroundColor: "#fff",
                borderRadius: 24,
                borderWidth: 1,
                borderColor: BORDER,
                marginBottom: 14,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
            }}
        >
            {/* Bandeau de couleur discret selon le rôle */}
            <View
                style={{
                    height: 4,
                    backgroundColor: isAdmin ? "#7C3AED" : COLORS.primary,
                }}
            />

            <View style={{ padding: 18 }}>
                {/* En-tête : avatar + nom + badge rôle */}
                <View className="flex-row items-center mb-4">
                    {user.image ? (
                        <Image
                            source={{ uri: user.image }}
                            style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
                        />
                    ) : (
                        <View
                            className="items-center justify-center mr-3"
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: isAdmin ? "#7C3AED" : COLORS.primary,
                            }}
                        >
                            <Text className="text-white font-bold text-base">{initial}</Text>
                        </View>
                    )}
                    <View className="flex-1">
                        <Text
                            style={{ fontWeight: "700", color: INK, fontSize: 15.5 }}
                            numberOfLines={1}
                        >
                            {user.name || "—"}
                        </Text>
                        <Text
                            style={{ color: MUTED, fontSize: 12.5, marginTop: 2 }}
                            numberOfLines={1}
                        >
                            {user.email}
                        </Text>
                    </View>
                    <View
                        style={{
                            paddingVertical: 5,
                            paddingHorizontal: 10,
                            borderRadius: 999,
                            backgroundColor: isAdmin ? "#EDE9FE" : SURFACE,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 10,
                                fontWeight: "800",
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                                color: isAdmin ? "#7C3AED" : MUTED,
                            }}
                        >
                            {user.role}
                        </Text>
                    </View>
                </View>

                {/* Détails */}
                <View
                    style={{
                        backgroundColor: SURFACE,
                        borderRadius: 16,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        gap: 9,
                    }}
                >
                    <DetailRow icon="call-outline" label={user.phone || "—"} />
                    <DetailRow icon="calendar-outline" label={joined} />
                    <DetailRow icon="heart-outline" label={wishlistLabel} />
                    <DetailRow
                        icon={hasPushToken ? "notifications-outline" : "notifications-off-outline"}
                        label={
                            hasPushToken
                                ? t("notificationsEnabled") || "Notifications activées"
                                : t("notificationsDisabled") || "Notifications désactivées"
                        }
                        muted={!hasPushToken}
                    />
                </View>
            </View>
        </View>
    );
};

const DetailRow = ({
    icon,
    label,
    muted,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    muted?: boolean;
}) => (
    <View className="flex-row items-center">
        <Ionicons
            name={icon}
            size={14}
            color={muted ? "#C4C4CB" : COLORS.primary}
            style={{ marginRight: 8 }}
        />
        <Text
            style={{ color: muted ? "#C4C4CB" : "#5A5A62", fontSize: 12.5, flex: 1 }}
            numberOfLines={1}
        >
            {label}
        </Text>
    </View>
);