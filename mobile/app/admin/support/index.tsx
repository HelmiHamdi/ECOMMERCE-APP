import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import Header from "@/components/Header";
import { COLORS } from "@/constants";
import { useAuth } from "@clerk/clerk-expo";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/constants/api";

// -----------------------------------------------------------------------
// Page liste "Service Après-Vente" pour l'admin.
// Route conseillée : app/admin/support/index.tsx
// (AdminTicketDetailScreen doit être en app/admin/support/[id].tsx pour
// matcher router.push(`/admin/support/${item._id}`) ci-dessous)
// -----------------------------------------------------------------------

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

// ------- labelKey/fallback au lieu de label fixe : traduit selon la langue active -------
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
  return: { labelKey: "categoryReturnShort", fallback: "Retour / Remb.", icon: "return-down-back-outline" },
  defective: { labelKey: "categoryDefectiveShort", fallback: "Défectueux", icon: "warning-outline" },
  delivery: { labelKey: "categoryDelivery", fallback: "Livraison", icon: "car-outline" },
  payment: { labelKey: "categoryPayment", fallback: "Paiement", icon: "card-outline" },
  other: { labelKey: "categoryOther", fallback: "Autre", icon: "help-circle-outline" },
};

const STATUS_FILTERS: {
  key: TicketStatus | "all";
  labelKey: string;
  fallback: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "all", labelKey: "filterAll", fallback: "Toutes", icon: "apps-outline" },
  { key: "open", labelKey: "filterOpen", fallback: "Ouvertes", icon: "time-outline" },
  { key: "in_progress", labelKey: "filterInProgress", fallback: "En cours", icon: "sync-outline" },
  { key: "closed", labelKey: "filterClosed", fallback: "Résolues", icon: "checkmark-done-outline" },
];

const CATEGORY_FILTERS: {
  key: TicketCategory | "all";
  labelKey: string;
  fallback: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "all", labelKey: "filterAllCategories", fallback: "Tous motifs", icon: "grid-outline" },
  { key: "order", labelKey: "categoryOrder", fallback: "Commande", icon: "bag-outline" },
  { key: "return", labelKey: "categoryReturnShort", fallback: "Retour / Remb.", icon: "return-down-back-outline" },
  { key: "defective", labelKey: "categoryDefectiveShort", fallback: "Défectueux", icon: "warning-outline" },
  { key: "delivery", labelKey: "categoryDelivery", fallback: "Livraison", icon: "car-outline" },
  { key: "payment", labelKey: "categoryPayment", fallback: "Paiement", icon: "card-outline" },
  { key: "other", labelKey: "categoryOther", fallback: "Autre", icon: "help-circle-outline" },
];

const initials = (name?: string) =>
  (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

export default function AdminSupportScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { t } = useLanguage();

  const tf = (key: string, fallback: string) => {
    const val = t(key as any);
    if (!val || typeof val !== "string" || val.toLowerCase().includes("missing")) return fallback;
    return val;
  };

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");

  // On charge TOUTES les demandes une seule fois, et on filtre côté client.
  // Ça évite un aller-retour réseau à chaque changement d'onglet et garde
  // les compteurs par statut/motif toujours exacts.
  const loadTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await getToken();
      const res = await api.get("/support", {
        // _t : cache-buster — sans ça, revenir sur cette liste après avoir
        // changé un statut dans le détail peut réafficher l'ancien statut.
        params: { _t: Date.now() },
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      setTickets(res.data.data);
    } catch (err: any) {
      console.error(err);
      Toast.show({
        type: "error",
        text1: tf("error", "Erreur"),
        text2: err?.response?.data?.message ?? tf("somethingWrong", "Une erreur s'est produite"),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Recharge à chaque fois que l'écran redevient actif (retour depuis le
  // détail après avoir répondu / clôturé / changé le statut d'un ticket).
  useFocusEffect(
    useCallback(() => {
      loadTickets(true);
    }, [loadTickets])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadTickets(true);
  };

  const statusCounts = useMemo(
    () => ({
      all: tickets.length,
      open: tickets.filter((tk) => tk.status === "open").length,
      in_progress: tickets.filter((tk) => tk.status === "in_progress").length,
      closed: tickets.filter((tk) => tk.status === "closed").length,
    }),
    [tickets]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tickets.length };
    (Object.keys(CATEGORY_META) as TicketCategory[]).forEach((cat) => {
      counts[cat] = tickets.filter((tk) => tk.category === cat).length;
    });
    return counts;
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets
      .filter((tk) => statusFilter === "all" || tk.status === statusFilter)
      .filter((tk) => categoryFilter === "all" || tk.category === categoryFilter)
      // Les demandes urgentes remontent toujours en haut de la liste,
      // pour que l'équipe SAV les traite en priorité.
      .sort((a, b) => {
        if (a.priority === "high" && b.priority !== "high") return -1;
        if (b.priority === "high" && a.priority !== "high") return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [tickets, statusFilter, categoryFilter]);

  const renderItem = ({ item }: { item: Ticket }) => {
    const meta = STATUS_META[item.status];
    const catMeta = CATEGORY_META[item.category];
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/admin/support/${item._id}` as any)}
        className="rounded-2xl p-4 mb-3 mx-4"
        style={{
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: item.priority === "high" ? "#FCA5A5" : CARD_BORDER,
          borderLeftWidth: 4,
          borderLeftColor: meta.color,
        }}
      >
        <View className="flex-row items-center">
          <View
            className="w-9 h-9 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: `${COLORS.primary}18` }}
          >
            <Text className="text-[12px] font-bold" style={{ color: COLORS.primary }}>
              {initials(item.user?.name)}
            </Text>
          </View>

          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-0.5">
              <Text className="font-bold flex-1 mr-2 text-[14px]" style={{ color: INK }} numberOfLines={1}>
                {item.subject}
              </Text>
              <View
                className="px-2 py-1 rounded-full flex-row items-center"
                style={{ backgroundColor: meta.bg }}
              >
                <Ionicons name={meta.icon} size={10} color={meta.color} style={{ marginRight: 3 }} />
                <Text className="text-[10px] font-bold" style={{ color: meta.color }}>
                  {tf(meta.labelKey, meta.fallback)}
                </Text>
              </View>
            </View>
            <Text className="text-[12px]" style={{ color: MUTED }} numberOfLines={1}>
              {item.user?.name} · {item.user?.email}
            </Text>
          </View>
        </View>

        {/* ------- Badges catégorie / commande / urgence ------- */}
        <View className="flex-row flex-wrap items-center mt-2.5" style={{ gap: 6 }}>
          <View className="px-2 py-0.5 rounded-full flex-row items-center" style={{ backgroundColor: SURFACE }}>
            <Ionicons name={catMeta.icon} size={10} color={MUTED} style={{ marginRight: 3 }} />
            <Text className="text-[10px] font-bold" style={{ color: "#5C5C64" }}>
              {tf(catMeta.labelKey, catMeta.fallback)}
            </Text>
          </View>
          {item.orderNumber && (
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: SURFACE }}>
              <Text className="text-[10px] font-bold" style={{ color: "#5C5C64" }}>
                #{item.orderNumber}
              </Text>
            </View>
          )}
          {item.priority === "high" && (
            <View className="px-2 py-0.5 rounded-full flex-row items-center" style={{ backgroundColor: "#FEE2E2" }}>
              <Ionicons name="alert-circle" size={10} color={DANGER} style={{ marginRight: 3 }} />
              <Text className="text-[10px] font-bold" style={{ color: DANGER }}>
                {tf("urgent", "Urgent")}
              </Text>
            </View>
          )}
        </View>

        <Text className="text-[13px] mt-2.5 leading-[18px]" style={{ color: "#5C5C64" }} numberOfLines={2}>
          {item.message}
        </Text>

        <View className="flex-row items-center justify-between mt-3">
          <Text className="text-[11px]" style={{ color: "#B4B4BC" }}>
            {new Date(item.createdAt).toLocaleDateString()}{" "}
            {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
          {item.reply ? (
            <View className="flex-row items-center">
              <Ionicons name="checkmark-done-outline" size={13} color={COLORS.primary} />
              <Text className="text-[11px] ml-1 font-semibold" style={{ color: COLORS.primary }}>
                {tf("replied", "Répondu")}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center">
              <Ionicons name="alert-circle-outline" size={13} color="#EAB308" />
              <Text className="text-[11px] ml-1 font-semibold" style={{ color: "#EAB308" }}>
                {tf("awaitingReply", "En attente")}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Header title={tf("supportRequests", "Service Après-Vente")} showBack />

      {/* ------- Filtres statut -------
          Important : le ScrollView horizontal étire ses enfants sur toute
          sa hauteur par défaut (alignItems "stretch"). On fixe une hauteur
          et on force alignItems "center" pour garder des puces compactes. */}
      <View style={{ height: 52, borderBottomWidth: 1, borderBottomColor: "#F0F0F3" }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            alignItems: "center",
            height: 52,
          }}
        >
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.key;
            const count = statusCounts[f.key];
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setStatusFilter(f.key)}
                activeOpacity={0.85}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  height: 34,
                  paddingHorizontal: 13,
                  borderRadius: 17,
                  marginRight: 8,
                  backgroundColor: active ? COLORS.primary : SURFACE,
                }}
              >
                <Ionicons name={f.icon} size={13} color={active ? "#fff" : MUTED} style={{ marginRight: 5 }} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "#fff" : "#5C5C64" }}>
                  {tf(f.labelKey, f.fallback)}
                </Text>
                {count > 0 && (
                  <View
                    style={{
                      marginLeft: 5,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      paddingHorizontal: 4,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? "rgba(255,255,255,0.25)" : "#fff",
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "700", color: active ? "#fff" : MUTED }}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ------- Filtres motif SAV ------- */}
      <View style={{ height: 46, borderBottomWidth: 1, borderBottomColor: "#F0F0F3" }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            alignItems: "center",
            height: 46,
          }}
        >
          {CATEGORY_FILTERS.map((f) => {
            const active = categoryFilter === f.key;
            const count = categoryCounts[f.key];
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setCategoryFilter(f.key)}
                activeOpacity={0.85}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  height: 30,
                  paddingHorizontal: 11,
                  borderRadius: 15,
                  marginRight: 8,
                  backgroundColor: active ? INK : SURFACE,
                }}
              >
                <Ionicons name={f.icon} size={12} color={active ? "#fff" : MUTED} style={{ marginRight: 5 }} />
                <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "#fff" : "#5C5C64" }}>
                  {tf(f.labelKey, f.fallback)}
                </Text>
                {count > 0 && (
                  <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "#fff" : MUTED, marginLeft: 4 }}>
                    ({count})
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filteredTickets.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: SURFACE }}>
            <Ionicons name="chatbubble-ellipses-outline" size={28} color={MUTED} />
          </View>
          <Text className="text-center text-[13px]" style={{ color: MUTED }}>
            {tf("noTicketsAvailable", "Aucune demande pour le moment")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
}