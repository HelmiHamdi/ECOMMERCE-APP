import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import Toast from "react-native-toast-message";
import Header from "@/components/Header";
import { COLORS } from "@/constants";
import { useAuth } from "@clerk/clerk-expo";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/constants/api";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const SURFACE = "#F6F6F9";
const CARD_BORDER = "#ECECF1";
const INK = "#13131A";
const MUTED = "#8D8D96";
const DANGER = "#EF4444";
const MAX_MESSAGE_LENGTH = 800;

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
};

// ------- Statuts : labelKey pointe vers les clés JSON, plus de texte en dur -------
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

// Catégories SAV proposées au client — couvre les motifs les plus courants
// d'un service après-vente e-commerce. labelKey pointe vers les clés JSON.
const CATEGORY_OPTIONS: {
  key: TicketCategory;
  labelKey: string;
  fallback: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "order", labelKey: "categoryOrder", fallback: "Commande", icon: "bag-outline" },
  { key: "return", labelKey: "categoryReturn", fallback: "Retour / Remboursement", icon: "return-down-back-outline" },
  { key: "defective", labelKey: "categoryDefective", fallback: "Produit défectueux", icon: "warning-outline" },
  { key: "delivery", labelKey: "categoryDelivery", fallback: "Livraison", icon: "car-outline" },
  { key: "payment", labelKey: "categoryPayment", fallback: "Paiement", icon: "card-outline" },
  { key: "other", labelKey: "categoryOther", fallback: "Autre", icon: "help-circle-outline" },
];

export default function SupportScreen() {
  const { getToken } = useAuth();
  const { t } = useLanguage();

  const tf = (key: string, fallback: string) => {
    const val = t(key as any);
    if (!val || typeof val !== "string" || val.toLowerCase().includes("missing")) return fallback;
    return val;
  };

  // Map catégorie -> libellé traduit, reconstruite à chaque rendu (dépend de la langue active)
  const CATEGORY_LABELS: Record<TicketCategory, string> = CATEGORY_OPTIONS.reduce(
    (acc, opt) => ({ ...acc, [opt.key]: tf(opt.labelKey, opt.fallback) }),
    {} as Record<TicketCategory, string>
  );

  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<"subject" | "message" | "order" | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTickets = useCallback(async (silent = false) => {
    if (!silent) setLoadingTickets(true);
    try {
      const token = await getToken();
      const res = await api.get("/support/my", {
        // _t : cache-buster pour forcer une vraie requête réseau à chaque appel
        params: { _t: Date.now() },
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      setTickets(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTickets(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTickets(true);
    }, [loadTickets])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadTickets(true);
  };

  const handleSubmit = async () => {
    if (!category) {
      Toast.show({
        type: "error",
        text1: tf("missingFields", "Champs manquants"),
        text2: tf("categoryRequired", "Choisissez le motif de votre demande"),
      });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      Toast.show({
        type: "error",
        text1: tf("missingFields", "Champs manquants"),
        text2: tf("subjectAndMessageRequired", "Le sujet et le message sont requis"),
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await api.post(
        "/support",
        {
          subject: subject.trim(),
          message: message.trim(),
          category,
          orderNumber: orderNumber.trim() || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Mise à jour optimiste : on insère directement le ticket créé en tête
      // de liste plutôt que de refaire un appel réseau.
      const newTicket: Ticket = res.data.data;
      setTickets((prev) => [newTicket, ...prev]);

      Toast.show({
        type: "success",
        text1: tf("ticketSent", "Message envoyé"),
        text2: tf("ticketSentSubtitle", "Notre service client vous répondra rapidement"),
      });
      setSubject("");
      setMessage("");
      setOrderNumber("");
      setCategory(null);
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

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Header title={tf("support", "Service Après-Vente")} showBack />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          {/* ------- En-tête d'intro ------- */}
          <View
            className="rounded-3xl p-5 mb-6 flex-row items-center"
            style={{ backgroundColor: `${COLORS.primary}12` }}
          >
            <View
              className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
              style={{ backgroundColor: `${COLORS.primary}22` }}
            >
              <Ionicons name="headset-outline" size={24} color={COLORS.primary} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-[15px]" style={{ color: INK }}>
                {tf("contactSupport", "Contacter le service client")}
              </Text>
              <Text className="text-[12px] mt-1" style={{ color: MUTED }}>
                {tf("supportIntro", "Commande, retour, produit défectueux... on vous répond au plus vite")}
              </Text>
            </View>
          </View>

          {/* ------- Sélecteur de motif (catégorie SAV) ------- */}
          <Text className="text-[13px] font-semibold mb-2" style={{ color: "#4A4A4F" }}>
            {tf("requestReason", "Motif de la demande")}
          </Text>
          <View className="flex-row flex-wrap mb-5" style={{ gap: 8 }}>
            {CATEGORY_OPTIONS.map((opt) => {
              const active = category === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setCategory(opt.key)}
                  activeOpacity={0.85}
                  className="flex-row items-center px-3 py-2.5 rounded-2xl"
                  style={{
                    backgroundColor: active ? COLORS.primary : SURFACE,
                    borderWidth: 1,
                    borderColor: active ? COLORS.primary : CARD_BORDER,
                  }}
                >
                  <Ionicons
                    name={opt.icon}
                    size={14}
                    color={active ? "#fff" : MUTED}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    className="text-[12px] font-bold"
                    style={{ color: active ? "#fff" : "#5C5C64" }}
                  >
                    {tf(opt.labelKey, opt.fallback)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ------- Référence commande (facultative) ------- */}
          <View className="mb-4">
            <Text className="text-[13px] font-semibold mb-2" style={{ color: "#4A4A4F" }}>
              {tf("orderNumber", "Numéro de commande (facultatif)")}
            </Text>
            <TextInput
              className="rounded-2xl px-4 py-3.5"
              style={{
                backgroundColor: SURFACE,
                color: INK,
                borderWidth: 1.5,
                borderColor: focusedField === "order" ? COLORS.primary : "transparent",
              }}
              placeholder={tf("orderNumberPlaceholder", "Ex: CMD-20394")}
              placeholderTextColor="#ABABB2"
              value={orderNumber}
              onChangeText={setOrderNumber}
              onFocus={() => setFocusedField("order")}
              onBlur={() => setFocusedField(null)}
              maxLength={60}
            />
          </View>

          {/* ------- Formulaire ------- */}
          <View className="mb-4">
            <Text className="text-[13px] font-semibold mb-2" style={{ color: "#4A4A4F" }}>
              {tf("subject", "Sujet")}
            </Text>
            <TextInput
              className="rounded-2xl px-4 py-3.5"
              style={{
                backgroundColor: SURFACE,
                color: INK,
                borderWidth: 1.5,
                borderColor: focusedField === "subject" ? COLORS.primary : "transparent",
              }}
              placeholder={tf("subjectPlaceholder", "Ex: Colis endommagé à la réception")}
              placeholderTextColor="#ABABB2"
              value={subject}
              onChangeText={setSubject}
              onFocus={() => setFocusedField("subject")}
              onBlur={() => setFocusedField(null)}
              maxLength={120}
            />
          </View>

          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[13px] font-semibold" style={{ color: "#4A4A4F" }}>
                {tf("message", "Message")}
              </Text>
              <Text className="text-[11px]" style={{ color: MUTED }}>
                {message.length}/{MAX_MESSAGE_LENGTH}
              </Text>
            </View>
            <TextInput
              className="rounded-2xl px-4 py-3.5"
              style={{
                backgroundColor: SURFACE,
                color: INK,
                minHeight: 130,
                textAlignVertical: "top",
                borderWidth: 1.5,
                borderColor: focusedField === "message" ? COLORS.primary : "transparent",
              }}
              placeholder={tf("messagePlaceholder", "Décrivez votre problème en détail...")}
              placeholderTextColor="#ABABB2"
              value={message}
              onChangeText={(txt) => setMessage(txt.slice(0, MAX_MESSAGE_LENGTH))}
              onFocus={() => setFocusedField("message")}
              onBlur={() => setFocusedField(null)}
              multiline
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
            className="rounded-full py-4 items-center flex-row justify-center"
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
                <Text className="font-bold text-white text-[15px]">{tf("send", "Envoyer")}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* ------- Séparateur ------- */}
          <View className="flex-row items-center mt-9 mb-4">
            <Text className="font-bold text-[16px]" style={{ color: INK }}>
              {tf("myTickets", "Mes demandes")}
            </Text>
            {tickets.length > 0 && (
              <View
                className="ml-2 px-2 py-0.5 rounded-full"
                style={{ backgroundColor: SURFACE }}
              >
                <Text className="text-[11px] font-bold" style={{ color: MUTED }}>
                  {tickets.length}
                </Text>
              </View>
            )}
          </View>

          {/* ------- Historique ------- */}
          {loadingTickets ? (
            <View className="py-10 items-center">
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : tickets.length === 0 ? (
            <View className="items-center py-10 px-6">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: SURFACE }}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={28} color={MUTED} />
              </View>
              <Text className="text-center text-[13px]" style={{ color: MUTED }}>
                {tf("noTicketsYet", "Aucune demande pour le moment")}
              </Text>
            </View>
          ) : (
            tickets.map((ticket) => {
              const meta = STATUS_META[ticket.status];
              return (
                <View
                  key={ticket._id}
                  className="rounded-2xl p-4 mb-3"
                  style={{
                    backgroundColor: "#fff",
                    borderWidth: 1,
                    borderColor: CARD_BORDER,
                    borderLeftWidth: 4,
                    borderLeftColor: meta.color,
                  }}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="font-semibold flex-1 mr-2 text-[14px]" style={{ color: INK }} numberOfLines={1}>
                      {ticket.subject}
                    </Text>
                    <View
                      className="px-2.5 py-1 rounded-full flex-row items-center"
                      style={{ backgroundColor: meta.bg }}
                    >
                      <Ionicons name={meta.icon} size={11} color={meta.color} style={{ marginRight: 4 }} />
                      <Text className="text-[11px] font-bold" style={{ color: meta.color }}>
                        {tf(meta.labelKey, meta.fallback)}
                      </Text>
                    </View>
                  </View>

                  {/* ------- Badges catégorie / commande ------- */}
                  <View className="flex-row flex-wrap items-center mb-2" style={{ gap: 6 }}>
                    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: SURFACE }}>
                      <Text className="text-[10px] font-bold" style={{ color: "#5C5C64" }}>
                        {CATEGORY_LABELS[ticket.category]}
                      </Text>
                    </View>
                    {ticket.orderNumber && (
                      <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: SURFACE }}>
                        <Text className="text-[10px] font-bold" style={{ color: "#5C5C64" }}>
                          #{ticket.orderNumber}
                        </Text>
                      </View>
                    )}
                    {ticket.priority === "high" && (
                      <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FEE2E2" }}>
                        <Text className="text-[10px] font-bold" style={{ color: DANGER }}>
                          {tf("urgent", "Urgent")}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text className="text-[13px] leading-[18px]" style={{ color: MUTED }}>
                    {ticket.message}
                  </Text>

                  <Text className="text-[11px] mt-2" style={{ color: "#B4B4BC" }}>
                    {new Date(ticket.createdAt).toLocaleDateString()} ·{" "}
                    {new Date(ticket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>

                  {ticket.reply && (
                    <View
                      className="mt-3 pt-3 pl-3"
                      style={{ borderTopWidth: 1, borderTopColor: "#F0F0F3" }}
                    >
                      <View className="flex-row items-center mb-1.5">
                        <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.primary} />
                        <Text className="text-[12px] font-bold ml-1.5" style={{ color: COLORS.primary }}>
                          {tf("supportReply", "Réponse du service client")}
                        </Text>
                      </View>
                      <Text className="text-[13px] leading-[18px]" style={{ color: INK }}>
                        {ticket.reply}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}