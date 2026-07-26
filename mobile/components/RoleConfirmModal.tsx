import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

const { width } = Dimensions.get("window");

const INK = "#13131A";
const MUTED = "#8D8D96";
const BORDER = "#ECECF1";
const SURFACE = "#F5F5F8";

type RoleConfirmModalProps = {
    visible: boolean;
    isPromoting: boolean;
    userName: string;
    userEmail: string;
    userInitial: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
    t: (key: string) => string;
};

export default function RoleConfirmModal({
    visible,
    isPromoting,
    userName,
    userEmail,
    userInitial,
    onConfirm,
    onCancel,
    loading = false,
    t,
}: RoleConfirmModalProps) {
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(16)).current;

    useEffect(() => {
        if (visible) {
            scaleAnim.setValue(0.9);
            opacityAnim.setValue(0);
            translateY.setValue(16);

            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 90,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(translateY, {
                    toValue: 0,
                    friction: 8,
                    tension: 90,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    // Une seule couleur d'accent, discrète — le reste reste en noir/blanc/gris
    const accent = isPromoting ? "#4338CA" : "#DC2626";
    const accentSoft = isPromoting ? "#EEF2FF" : "#FEF2F2";
    const accentBorder = isPromoting ? "#C7D2FE" : "#FCA5A5";

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onCancel}
        >
            <TouchableWithoutFeedback onPress={onCancel}>
                <View style={styles.backdrop}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.card,
                                {
                                    opacity: opacityAnim,
                                    transform: [{ scale: scaleAnim }, { translateY }],
                                },
                            ]}
                        >
                            {/* Poignée style bottom-sheet / alerte mobile */}
                            <View style={styles.handle} />

                            {/* Avatar seul en haut, pas d'icône superposée */}
                            <View
                                style={[
                                    styles.avatar,
                                    { borderColor: accent },
                                ]}
                            >
                                <Text style={[styles.avatarText, { color: accent }]}>
                                    {userInitial}
                                </Text>
                            </View>

                            {/* Petit badge icône séparé, sous l'avatar */}
                            <View style={[styles.iconBadge, { backgroundColor: accentSoft, borderColor: accentBorder }]}>
                                <Ionicons
                                    name={isPromoting ? "shield-checkmark-outline" : "shield-outline"}
                                    size={13}
                                    color={accent}
                                    style={{ marginRight: 5 }}
                                />
                                <Text style={[styles.iconBadgeText, { color: accent }]}>
                                    {isPromoting
                                        ? t("roleAdmins") || "Admin"
                                        : t("roleUsers") || "Utilisateur"}
                                </Text>
                            </View>

                            <Text style={styles.title}>
                                {isPromoting
                                    ? t("promoteToAdmin") || "Promouvoir en admin"
                                    : t("demoteToUser") || "Retirer les droits admin"}
                            </Text>

                            <Text style={styles.userName} numberOfLines={1}>
                                {userName}
                            </Text>
                            <Text style={styles.userEmail} numberOfLines={1}>
                                {userEmail}
                            </Text>

                            <View style={styles.divider} />

                            <View style={styles.warningBox}>
                                <Ionicons
                                    name="information-circle-outline"
                                    size={16}
                                    color={MUTED}
                                    style={{ marginRight: 8, marginTop: 1 }}
                                />
                                <Text style={styles.warningText}>
                                    {isPromoting
                                        ? t("promoteWarning") ||
                                          "Cet utilisateur aura accès au tableau de bord admin."
                                        : t("demoteWarning") ||
                                          "Cet utilisateur perdra tous ses accès admin."}
                                </Text>
                            </View>

                            {/* Boutons */}
                            <View style={styles.buttonRow}>
                                <TouchableOpacity
                                    onPress={onCancel}
                                    activeOpacity={0.75}
                                    disabled={loading}
                                    style={styles.cancelBtn}
                                >
                                    <Text style={styles.cancelText}>
                                        {t("cancel") || "Annuler"}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={onConfirm}
                                    activeOpacity={0.85}
                                    disabled={loading}
                                    style={[
                                        styles.confirmBtn,
                                        {
                                            backgroundColor: INK,
                                            opacity: loading ? 0.6 : 1,
                                        },
                                    ]}
                                >
                                    {loading ? (
                                        <Text style={styles.confirmText}>
                                            {t("loading") || "Chargement..."}
                                        </Text>
                                    ) : (
                                        <Text style={styles.confirmText}>
                                            {t("confirm") || "Confirmer"}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const CARD_WIDTH = Math.min(width - 48, 360);

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(13,13,20,0.5)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    card: {
        width: CARD_WIDTH,
        backgroundColor: "#fff",
        borderRadius: 24,
        paddingHorizontal: 22,
        paddingTop: 14,
        paddingBottom: 20,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
        elevation: 10,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#E2E2E7",
        marginBottom: 18,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
        borderWidth: 2,
    },
    avatarText: {
        fontWeight: "800",
        fontSize: 20,
    },
    iconBadge: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginTop: 10,
    },
    iconBadgeText: {
        fontSize: 10.5,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    title: {
        fontSize: 17,
        fontWeight: "800",
        color: INK,
        textAlign: "center",
        marginTop: 16,
        letterSpacing: -0.3,
    },
    userName: {
        fontSize: 14,
        fontWeight: "700",
        color: INK,
        marginTop: 8,
    },
    userEmail: {
        fontSize: 12.5,
        color: MUTED,
        marginTop: 2,
    },
    divider: {
        width: "100%",
        height: 1,
        backgroundColor: BORDER,
        marginTop: 18,
        marginBottom: 14,
    },
    warningBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: SURFACE,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 11,
        width: "100%",
        marginBottom: 20,
    },
    warningText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#5A5A62",
        flex: 1,
        lineHeight: 17,
    },
    buttonRow: {
        flexDirection: "row",
        width: "100%",
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: BORDER,
    },
    cancelText: {
        fontSize: 13.5,
        fontWeight: "700",
        color: "#5A5A62",
    },
    confirmBtn: {
        flex: 1,
        marginLeft: 10,
        paddingVertical: 13,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    confirmText: {
        fontSize: 13.5,
        fontWeight: "700",
        color: "#fff",
    },
});