import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import Toast from "react-native-toast-message";
import Header from "@/components/Header";
import { COLORS } from "@/constants";
import { useAuth } from "@clerk/clerk-expo";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/constants/api";

const SURFACE = "#F6F6F9";
const CARD_BORDER = "#ECECF1";
const INK = "#13131A";
const MUTED = "#8D8D96";
const DANGER = "#EF4444";

type TicketStatus = "open" | "in_progress" | "closed";
type TicketCategory = "order" | "return" | "defective" | "delivery" | "payment" | "other";
type TicketPriority = "low" | "normal" | "high";

type Ticket = {
  _id: string;
  subject: string;
  message: string;
  category: TicketCategory;
  orderNumber?: string;
  priority: TicketPriority;
  status: TicketStatus;
  reply?: string;
  createdAt: string;
  user: { name: string; email: string };
};

// ------- labelKey/fallback : traduit selon la langue active -------
const STATUS_META: Record<
  TicketStatus,
  { labelKey: string; fallback: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  open: { labelKey: "statusOpen", fallback: "Ouvert", color: "#B45309", bg: "#FEF3C7", icon: "time-outline" },
  in_progress: {
    labelKey: "statusInProgress",
    fallback: "En cours",
    color: COLORS.primary,
    bg: `${COLORS.primary}18`,
    icon: "sync-outline",
  },
  closed: {
    labelKey: "statusClosed",
    fallback: "Résolu",
    color: "#15803D",
    bg: "#DCFCE7",
    icon: "checkmark-done-outline",
  },
};

const CATEGORY_META: Record<
  TicketCategory,
  { labelKey: string; fallback: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  order: { labelKey: "categoryOrder", fallback: "Commande", icon: "bag-outline" },
  return: { labelKey: "categoryReturn", fallback: "Retour / Remboursement", icon: "return-down-back-outline" },
  defective: { labelKey: "categoryDefective", fallback: "Produit défectueux", icon: "warning-outline" },
  delivery: { labelKey: "categoryDelivery", fallback: "Livraison", icon: "car-outline" },
  payment: { labelKey: "categoryPayment", fallback: "Paiement", icon: "card-outline" },
  other: { labelKey: "categoryOther", fallback: "Autre", icon: "help-circle-outline" },
};

// Note : le libellé "open" ici diffère de STATUS_META ("En attente" vs "Ouvert"),
// d'où une clé dédiée statusOptionPending pour ne pas les confondre.
const STATUS_OPTIONS: { key: TicketStatus; labelKey: string; fallback: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "open", labelKey: "statusOptionPending", fallback: "En attente", icon: "time-outline" },
  { key: "in_progress", labelKey: "statusInProgress", fallback: "En cours", icon: "sync-outline" },
  { key: "closed", labelKey: "statusClosed", fallback: "Résolu", icon: "checkmark-done-outline" },
];

const PRIORITY_OPTIONS: { key: TicketPriority; labelKey: string; fallback: string; color: string }[] = [
  { key: "low", labelKey: "priorityLow", fallback: "Faible", color: "#6B7280" },
  { key: "normal", labelKey: "priorityNormal", fallback: "Normale", color: COLORS.primary },
  { key: "high", labelKey: "priorityHigh", fallback: "Urgente", color: DANGER },
];

const initials = (name?: string) =>
  (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

export default function AdminTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const { t } = useLanguage();

  const tf = (key: string, fallback: string) => {
    const val = t(key as any);
    if (!val || typeof val !== "string" || val.toLowerCase().includes("missing")) return fallback;
    return val;
  };

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [focused, setFocused] = useState(false);

  const loadTicket = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const token = await getToken();
        const res = await api.get(`/support/${id}`, {
          // _t : cache-buster, sinon un retour sur cet écran peut réafficher
          // un statut périmé (mis en cache) après un changement récent.
          params: { _t: Date.now() },
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        setTicket(res.data.data);
        setReply(res.data.data.reply ?? "");
      } catch (err: any) {
        Toast.show({
          type: "error",
          text1: tf("error", "Erreur"),
          text2: err?.response?.data?.message ?? tf("somethingWrong", "Une erreur s'est produite"),
        });
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Resynchronise avec le serveur à chaque retour sur cet écran (ex: après
  // avoir navigué ailleurs puis être revenu), pour éviter tout état périmé.
  useFocusEffect(
    useCallback(() => {
      loadTicket(true);
    }, [loadTicket])
  );

  const handleReply = async () => {
    if (!reply.trim()) {
      Toast.show({
        type: "error",
        text1: tf("missingFields", "Champ manquant"),
        text2: tf("replyRequired", "La réponse est requise"),
      });
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await api.put(
        `/support/${id}/reply`,
        { reply: reply.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTicket(res.data.data);
      Toast.show({ type: "success", text1: tf("replySent", "Réponse envoyée") });
      // Resynchronisation pour garantir la cohérence avec le serveur.
      await loadTicket(true);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: tf("error", "Erreur"),
        text2: err?.response?.data?.message ?? tf("somethingWrong", "Une erreur s'est produite"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    Alert.alert(
      tf("confirmClose", "Clôturer la demande"),
      tf("confirmCloseMsg", "Voulez-vous clôturer cette demande ?"),
      [
        { text: tf("cancel", "Annuler"), style: "cancel" },
        {
          text: tf("close", "Clôturer"),
          style: "destructive",
          onPress: async () => {
            setClosing(true);
            try {
              const token = await getToken();
              const res = await api.put(
                `/support/${id}/close`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setTicket(res.data.data);
              Toast.show({ type: "success", text1: tf("ticketClosed", "Demande clôturée") });
              await loadTicket(true);
            } catch (err: any) {
              Toast.show({
                type: "error",
                text1: tf("error", "Erreur"),
                text2: err?.response?.data?.message ?? tf("somethingWrong", "Une erreur s'est produite"),
              });
            } finally {
              setClosing(false);
            }
          },
        },
      ]
    );
  };

  const handleChangeStatus = async (status: TicketStatus) => {
    if (!ticket || status === ticket.status || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const token = await getToken();
      const res = await api.put(
        `/support/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTicket(res.data.data);
      Toast.show({ type: "success", text1: tf("statusUpdated", "Statut mis à jour") });
      // Resynchronisation immédiate avec le serveur, pour être sûr que
      // l'écran (et la liste au retour) reflète bien le nouveau statut.
      await loadTicket(true);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: tf("error", "Erreur"),
        text2: err?.response?.data?.message ?? tf("somethingWrong", "Une erreur s'est produite"),
      });
      // En cas d'erreur, on resynchronise aussi pour éviter un état local faux.
      loadTicket(true);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleChangePriority = async (priority: TicketPriority) => {
    if (!ticket || priority === ticket.priority || updatingPriority) return;
    setUpdatingPriority(true);
    try {
      const token = await getToken();
      const res = await api.put(
        `/support/${id}/priority`,
        { priority },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTicket(res.data.data);
      Toast.show({ type: "success", text1: tf("priorityUpdated", "Priorité mise à jour") });
      await loadTicket(true);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: tf("error", "Erreur"),
        text2: err?.response?.data?.message ?? tf("somethingWrong", "Une erreur s'est produite"),
      });
      loadTicket(true);
    } finally {
      setUpdatingPriority(false);
    }
  };

  if (loading || !ticket) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const meta = STATUS_META[ticket.status];
  const catMeta = CATEGORY_META[ticket.category];
  const isClosed = ticket.status === "closed";

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Header title={tf("ticketDetail", "Détail de la demande SAV")} showBack />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          {/* ------- Statut + motif en évidence ------- */}
          <View className="items-center mb-5">
            <View
              className="px-4 py-2 rounded-full flex-row items-center mb-2"
              style={{ backgroundColor: meta.bg }}
            >
              <Ionicons name={meta.icon} size={14} color={meta.color} style={{ marginRight: 6 }} />
              <Text className="text-[12px] font-bold" style={{ color: meta.color }}>
                {tf(meta.labelKey, meta.fallback)}
              </Text>
            </View>
            <View className="flex-row flex-wrap items-center justify-center" style={{ gap: 6 }}>
              <View className="px-3 py-1.5 rounded-full flex-row items-center" style={{ backgroundColor: SURFACE }}>
                <Ionicons name={catMeta.icon} size={12} color={MUTED} style={{ marginRight: 5 }} />
                <Text className="text-[11px] font-bold" style={{ color: "#5C5C64" }}>
                  {tf(catMeta.labelKey, catMeta.fallback)}
                </Text>
              </View>
              {ticket.orderNumber && (
                <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: SURFACE }}>
                  <Text className="text-[11px] font-bold" style={{ color: "#5C5C64" }}>
                    {tf("orderPrefix", "Commande")} #{ticket.orderNumber}
                  </Text>
                </View>
              )}
              {ticket.priority === "high" && (
                <View className="px-3 py-1.5 rounded-full flex-row items-center" style={{ backgroundColor: "#FEE2E2" }}>
                  <Ionicons name="alert-circle" size={12} color={DANGER} style={{ marginRight: 5 }} />
                  <Text className="text-[11px] font-bold" style={{ color: DANGER }}>
                    {tf("urgent", "Urgent")}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ------- Sélecteur de statut (admin) ------- */}
          <Text className="text-[13px] font-semibold mb-2" style={{ color: "#4A4A4F" }}>
            {tf("changeStatus", "Changer le statut")}
          </Text>
          <View className="flex-row mb-5" style={{ gap: 8 }}>
            {STATUS_OPTIONS.map((opt) => {
              const active = ticket.status === opt.key;
              const optMeta = STATUS_META[opt.key];
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => handleChangeStatus(opt.key)}
                  disabled={updatingStatus}
                  activeOpacity={0.85}
                  className="flex-1 rounded-2xl py-3 items-center"
                  style={{
                    backgroundColor: active ? optMeta.color : SURFACE,
                    opacity: updatingStatus ? 0.6 : 1,
                  }}
                >
                  <Ionicons
                    name={opt.icon}
                    size={16}
                    color={active ? "#fff" : MUTED}
                    style={{ marginBottom: 4 }}
                  />
                  <Text
                    className="text-[11px] font-bold"
                    style={{ color: active ? "#fff" : "#5C5C64" }}
                  >
                    {tf(opt.labelKey, opt.fallback)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ------- Sélecteur de priorité (admin) ------- */}
          <Text className="text-[13px] font-semibold mb-2" style={{ color: "#4A4A4F" }}>
            {tf("changePriority", "Changer la priorité")}
          </Text>
          <View className="flex-row mb-5" style={{ gap: 8 }}>
            {PRIORITY_OPTIONS.map((opt) => {
              const active = ticket.priority === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => handleChangePriority(opt.key)}
                  disabled={updatingPriority}
                  activeOpacity={0.85}
                  className="flex-1 rounded-2xl py-3 items-center"
                  style={{
                    backgroundColor: active ? opt.color : SURFACE,
                    opacity: updatingPriority ? 0.6 : 1,
                  }}
                >
                  <Text
                    className="text-[11px] font-bold"
                    style={{ color: active ? "#fff" : "#5C5C64" }}
                  >
                    {tf(opt.labelKey, opt.fallback)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ------- Carte demande ------- */}
          <View
            className="rounded-2xl p-4 mb-5"
            style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: CARD_BORDER }}
          >
            <View className="flex-row items-center mb-3">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${COLORS.primary}18` }}
              >
                <Text className="text-[13px] font-bold" style={{ color: COLORS.primary }}>
                  {initials(ticket.user?.name)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-[13px]" style={{ color: INK }} numberOfLines={1}>
                  {ticket.user?.name}
                </Text>
                <Text className="text-[11px]" style={{ color: MUTED }} numberOfLines={1}>
                  {ticket.user?.email}
                </Text>
              </View>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: "#F0F0F3", paddingTop: 12 }}>
              <Text className="font-bold text-[15px] mb-2" style={{ color: INK }}>
                {ticket.subject}
              </Text>
              <Text className="text-[13px] leading-[19px]" style={{ color: "#5C5C64" }}>
                {ticket.message}
              </Text>
              <Text className="text-[11px] mt-3" style={{ color: "#B4B4BC" }}>
                {new Date(ticket.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* ------- Réponse existante (si déjà répondu) ------- */}
          {ticket.reply && (
            <View
              className="rounded-2xl p-4 mb-5"
              style={{ backgroundColor: `${COLORS.primary}0D`, borderWidth: 1, borderColor: `${COLORS.primary}22` }}
            >
              <View className="flex-row items-center mb-1.5">
                <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.primary} />
                <Text className="text-[12px] font-bold ml-1.5" style={{ color: COLORS.primary }}>
                  {tf("currentReply", "Réponse actuelle")}
                </Text>
              </View>
              <Text className="text-[13px] leading-[19px]" style={{ color: INK }}>
                {ticket.reply}
              </Text>
            </View>
          )}

          {/* ------- Zone de réponse ------- */}
          {!isClosed && (
            <>
              <Text className="text-[13px] font-semibold mb-2" style={{ color: "#4A4A4F" }}>
                {ticket.reply ? tf("editReply", "Modifier la réponse") : tf("yourReply", "Votre réponse")}
              </Text>
              <TextInput
                className="rounded-2xl px-4 py-3.5 mb-4"
                style={{
                  backgroundColor: SURFACE,
                  color: INK,
                  minHeight: 130,
                  textAlignVertical: "top",
                  borderWidth: 1.5,
                  borderColor: focused ? COLORS.primary : "transparent",
                }}
                placeholder={tf("replyPlaceholder", "Rédigez votre réponse...")}
                placeholderTextColor="#ABABB2"
                value={reply}
                onChangeText={setReply}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                multiline
              />

              <TouchableOpacity
                onPress={handleReply}
                disabled={submitting}
                activeOpacity={0.85}
                className="rounded-full py-4 items-center mb-3 flex-row justify-center"
                style={{
                  backgroundColor: submitting ? "#EDEDF0" : COLORS.primary,
                  shadowColor: COLORS.primary,
                  shadowOpacity: submitting ? 0 : 0.25,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: submitting ? 0 : 3,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color={MUTED} />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={17} color="#fff" style={{ marginRight: 8 }} />
                    <Text className="font-bold text-white text-[15px]">
                      {ticket.reply ? tf("updateReply", "Mettre à jour") : tf("sendReply", "Envoyer la réponse")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClose}
                disabled={closing}
                activeOpacity={0.85}
                className="rounded-full py-4 items-center flex-row justify-center"
                style={{ backgroundColor: "#FEE2E2" }}
              >
                {closing ? (
                  <ActivityIndicator color={DANGER} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-outline" size={18} color={DANGER} />
                    <Text className="font-bold text-[15px] ml-2" style={{ color: DANGER }}>
                      {tf("markAsClosed", "Marquer comme résolu")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {isClosed && (
            <View className="items-center py-4">
              <Ionicons name="checkmark-circle" size={32} color="#15803D" />
              <Text className="text-[13px] mt-2" style={{ color: MUTED }}>
                {tf("ticketAlreadyClosed", "Cette demande est déjà résolue")}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}