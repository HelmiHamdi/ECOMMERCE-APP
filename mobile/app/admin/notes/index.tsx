import { COLORS } from "@/constants";
import api from "@/constants/api";
import { Note, NoteType } from "@/constants/types";
import { subscribeNotesChanged } from "@/constants/noteEvents";
import { openMeetingLink } from "@/constants/meetingLink";
import { stripHtml } from "@/constants/stripHtml";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AdminBottomMenu from "@/components/AdminBottomMenu";
import MeetingCountdown from "@/components/MeetingCountdown";
import { useLanguage } from "@/context/LanguageContext";
import Toast from "react-native-toast-message";

const INK = "#13131A";
const MUTED = "#8D8D96";
const SURFACE = "#F5F5F8";
const BORDER = "#ECECF1";

type TypeFilter = "all" | NoteType;

export default function NotesListScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
    { key: "all", label: t("notesAll") || "Toutes" },
    { key: "note", label: t("notesNote") || "Notes" },
    { key: "meeting", label: t("notesMeeting") || "Réunions" },
  ];

  const fetchNotes = useCallback(async () => {
    try {
      const { data } = await api.get("/notes");
      if (data?.success) {
        setNotes(Array.isArray(data.data) ? data.data : []);
      } else {
        setNotes([]);
      }
    } catch (err: any) {
      console.error("Erreur chargement notes:", err?.response?.data || err.message);
      Toast.show({
        type: "error",
        text1: t("error") || "Erreur",
        text2:
          err?.response?.data?.message ||
          t("cannotLoadNotes") ||
          "Impossible de charger les notes",
      });
      setNotes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      fetchNotes();
    }, [fetchNotes])
  );

  useEffect(() => {
    const unsubscribe = subscribeNotesChanged((payload) => {
      setNotes((prev) => {
        if (payload.action === "create") {
          if (prev.some((n) => n._id === payload.note._id)) return prev;
          return [payload.note, ...prev];
        }
        if (payload.action === "update") {
          return prev.map((n) => (n._id === payload.note._id ? payload.note : n));
        }
        if (payload.action === "delete") {
          return prev.filter((n) => n._id !== payload.noteId);
        }
        return prev;
      });
    });

    return unsubscribe;
  }, []);

  const filteredNotes =
    typeFilter === "all" ? notes : notes.filter((n) => n.type === typeFilter);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
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
            {t("notes") || "Notes"}
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
              {filteredNotes.length}
            </Text>
          </View>
        )}
      </View>

      {/* Filtres par type */}
      <View className="flex-row px-4 mb-4" style={{ gap: 8 }}>
        {TYPE_FILTERS.map((f) => {
          const active = typeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setTypeFilter(f.key)}
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 150 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotes();
              }}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredNotes.length === 0 ? (
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
                <Ionicons name="document-text-outline" size={26} color="#B0B0B0" />
              </View>
              <Text className="text-secondary font-medium">
                {t("noNotesFound") || "Aucune note pour le moment"}
              </Text>
            </View>
          ) : (
            filteredNotes.map((note) => (
              <NoteCard key={note._id} note={note} t={t} router={router} />
            ))
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push("/admin/notes/create")}
        activeOpacity={0.85}
        style={{
          position: "absolute",
          bottom: 750,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: COLORS.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: COLORS.primary,
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 4,
        }}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      <AdminBottomMenu />
    </SafeAreaView>
  );
}

const NoteCard = ({
  note,
  t,
  router,
}: {
  note: Note;
  t: (key: string) => string;
  router: ReturnType<typeof useRouter>;
}) => {
  const isMeeting = note.type === "meeting";
  const accent = isMeeting ? "#059669" : "#6366F1";
  const accentSoft = isMeeting ? "#ECFDF5" : "#EEF2FF";

  return (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/admin/notes/[id]",
          params: { id: note._id },
        })
      }
      activeOpacity={0.85}
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
      <View style={{ height: 4, backgroundColor: accent }} />

      <View style={{ padding: 18 }}>
        <View className="flex-row items-center mb-2">
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: accentSoft,
              marginRight: 10,
            }}
          >
            <Ionicons
              name={isMeeting ? "videocam-outline" : "document-text-outline"}
              size={17}
              color={accent}
            />
          </View>
          <Text
            style={{ fontWeight: "700", color: INK, fontSize: 15.5, flex: 1 }}
            numberOfLines={1}
          >
            {note.title}
          </Text>
          <View
            style={{
              paddingVertical: 4,
              paddingHorizontal: 9,
              borderRadius: 999,
              backgroundColor: accentSoft,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "800",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: accent,
              }}
            >
              {isMeeting ? t("meeting") || "Réunion" : t("note") || "Note"}
            </Text>
          </View>
        </View>

        {!!note.content && (
          <Text
            style={{ color: MUTED, fontSize: 13, marginBottom: 10, lineHeight: 18 }}
            numberOfLines={2}
          >
            {stripHtml(note.content)}
          </Text>
        )}

        {isMeeting && note.meetingDate && (
          <View
            style={{
              backgroundColor: SURFACE,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 10,
            }}
          >
            <MeetingCountdown targetDate={note.meetingDate} />
          </View>
        )}

        {isMeeting && !!note.meetingLink?.trim() && (
          <TouchableOpacity
            onPress={() =>
              openMeetingLink(
                note.meetingLink!,
                (title, message) => Toast.show({ type: "error", text1: title, text2: message }),
                t("error") || "Erreur",
                t("cannotOpenLink") || "Impossible d'ouvrir ce lien."
              )
            }
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              alignSelf: "flex-start",
              marginBottom: 10,
              backgroundColor: "#ECFDF5",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
            }}
          >
            <Ionicons name="videocam-outline" size={14} color="#059669" />
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#059669" }}>
              {t("joinMeeting") || "Rejoindre la réunion"}
            </Text>
          </TouchableOpacity>
        )}

        <View className="flex-row items-center justify-between mt-1">
          <View className="flex-row items-center">
            {note.createdBy?.image ? (
              <Image
                source={{ uri: note.createdBy.image }}
                style={{ width: 22, height: 22, borderRadius: 11, marginRight: 7 }}
              />
            ) : (
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: SURFACE,
                  marginRight: 7,
                }}
              />
            )}
            <Text style={{ color: MUTED, fontSize: 12 }}>
              {note.createdBy?.name || t("admin") || "Admin"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#C4C4CB" />
        </View>
      </View>
    </TouchableOpacity>
  );
};