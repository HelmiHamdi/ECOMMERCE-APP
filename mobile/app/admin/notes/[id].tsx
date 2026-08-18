import { COLORS } from "@/constants";
import api from "@/constants/api";
import { Note, ReminderFrequency } from "@/constants/types";
import { emitNotesChanged } from "@/constants/noteEvents";
import { tr } from "@/constants/translations/translate";
import { normalizeUrl, openMeetingLink } from "@/constants/meetingLink";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CalendarModal from "@/components/CalendarModal";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import SuccessModal from "@/components/SuccessModal";
import ErrorModal from "@/components/ErrorModal";
import MeetingCountdown from "@/components/MeetingCountdown";
import RichTextEditor from "@/components/RichTextEditor";
import { useLanguage } from "@/context/LanguageContext";

const INK = "#13131A";
const MUTED = "#8D8D96";
const SURFACE = "#F5F5F8";
const BORDER = "#ECECF1";

export default function NoteDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { t } = useLanguage();

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingDate, setMeetingDate] = useState<Date | null>(null);
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>("none");
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  const showError = (title: string, message: string) => setErrorModal({ title, message });

  const REMINDER_OPTIONS: { label: string; value: ReminderFrequency }[] = [
    { label: tr(t, "reminderNone", "Aucun"), value: "none" },
    { label: tr(t, "reminderDaily", "Chaque jour"), value: "daily" },
    { label: tr(t, "reminderHourly", "Chaque heure"), value: "hourly" },
  ];

  const fetchNote = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get(`/notes/${id}`);
      if (!data?.success) throw new Error(data?.message || "Note introuvable");

      const fetched: Note = data.data;
      setNote(fetched);
      setTitle(fetched.title);
      setContent(fetched.content || "");
      setMeetingLink(fetched.meetingLink || "");
      setMeetingDate(fetched.meetingDate ? new Date(fetched.meetingDate) : null);
      setReminderFrequency(fetched.reminderFrequency || "none");
    } catch (err: any) {
      console.error("Erreur chargement note:", err?.response?.data || err.message);
      showError(
        tr(t, "error", "Erreur"),
        tr(t, "cannotLoadNote", "Impossible de charger cette note")
      );
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router, t]);

  useFocusEffect(
    useCallback(() => {
      fetchNote();
    }, [fetchNote])
  );

  const handleOpenLink = () => {
    openMeetingLink(
      meetingLink,
      showError,
      tr(t, "error", "Erreur"),
      tr(t, "cannotOpenLink", "Impossible d'ouvrir ce lien. Vérifiez son format.")
    );
  };

  const handleSave = async () => {
    if (!note) return;
    if (!title.trim()) {
      showError(tr(t, "error", "Erreur"), tr(t, "titleRequired", "Le titre est requis"));
      return;
    }
    if (note.type === "meeting" && !meetingDate) {
      showError(
        tr(t, "error", "Erreur"),
        tr(t, "selectMeetingDate", "Sélectionnez la date de la réunion")
      );
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.put(`/notes/${note._id}`, {
        title: title.trim(),
        content: content,
        type: note.type,
        meetingLink: note.type === "meeting" ? normalizeUrl(meetingLink) || null : null,
        meetingDate: note.type === "meeting" && meetingDate ? meetingDate.toISOString() : null,
        reminderFrequency: note.type === "meeting" ? reminderFrequency : "none",
      });

      if (!data?.success) throw new Error(data?.message || "Mise à jour échouée");

      setNote(data.data);
      setTitle(data.data.title);
      setContent(data.data.content || "");
      setMeetingLink(data.data.meetingLink || "");
      setMeetingDate(data.data.meetingDate ? new Date(data.data.meetingDate) : null);
      setReminderFrequency(data.data.reminderFrequency || "none");

      emitNotesChanged({ action: "update", note: data.data });
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error("UPDATE NOTE ERROR:", err?.response?.data || err.message);
      showError(
        tr(t, "error", "Erreur"),
        err?.response?.data?.message ||
          tr(t, "somethingWentWrong", "Une erreur est survenue")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!note) return;
    setDeleting(true);
    try {
      const { data } = await api.delete(`/notes/${note._id}`);
      if (data && data.success === false) {
        throw new Error(data.message || "Suppression échouée");
      }

      emitNotesChanged({ action: "delete", noteId: note._id });
      setShowDeleteModal(false);
      router.back();
    } catch (err: any) {
      console.error("DELETE NOTE ERROR:", err?.response?.data || err.message);
      setShowDeleteModal(false);
      showError(
        tr(t, "error", "Erreur"),
        err?.response?.data?.message || tr(t, "deleteFailed", "Suppression impossible")
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !note) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center" edges={["top"]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const isMeeting = note.type === "meeting";
  const accent = INK;
  const accentSoft = "#F0F0F2";

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
              color: accent,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {isMeeting ? tr(t, "meeting", "Réunion") : tr(t, "note", "Note")}
          </Text>
          <Text
            style={{ fontSize: 22, fontWeight: "800", color: INK, letterSpacing: -0.5, marginTop: 1 }}
            numberOfLines={1}
          >
            {note.title}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowDeleteModal(true)}
          activeOpacity={0.7}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FEF2F2",
            borderWidth: 1,
            borderColor: "#FCA5A5",
          }}
        >
          <Ionicons name="trash-outline" size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Auteur + countdown */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: BORDER,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          }}
        >
          <View className="flex-row items-center">
            {note.createdBy?.image ? (
              <Image
                source={{ uri: note.createdBy.image }}
                style={{ width: 34, height: 34, borderRadius: 17, marginRight: 10 }}
              />
            ) : (
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: SURFACE,
                  marginRight: 10,
                }}
              />
            )}
            <Text style={{ color: MUTED, fontSize: 13, fontWeight: "500" }}>
              {tr(t, "createdBy", "Créée par")} {note.createdBy?.name}
            </Text>
          </View>

          {isMeeting && meetingDate && (
            <View
              style={{
                backgroundColor: accentSoft,
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginTop: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="videocam-outline" size={16} color={accent} />
              <MeetingCountdown targetDate={meetingDate.toISOString()} />
            </View>
          )}
        </View>

        {/* Champs */}
        <FormCard>
          <FieldLabel>{tr(t, "title", "Titre")}</FieldLabel>
          <StyledInput value={title} onChangeText={setTitle} />

          <FieldLabel style={{ marginTop: 16 }}>{tr(t, "content", "Contenu")}</FieldLabel>
          <RichTextEditor
            initialHTML={content}
            onChangeHTML={setContent}
            placeholder={tr(t, "noteContentPlaceholder", "Écrire votre note...")}
            minHeight={160}
          />
        </FormCard>

        {isMeeting && (
          <FormCard>
            <FieldLabel>{tr(t, "meetingLink", "Lien de réunion")}</FieldLabel>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: SURFACE,
                borderRadius: 14,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: BORDER,
              }}
            >
              <Ionicons name="link-outline" size={16} color={MUTED} />
              <TextInput
                value={meetingLink}
                onChangeText={setMeetingLink}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, color: INK, fontSize: 14 }}
                placeholderTextColor="#ABABB2"
              />
            </View>
            {!!meetingLink.trim() && (
              <TouchableOpacity
                onPress={handleOpenLink}
                activeOpacity={0.7}
                style={{ marginTop: 8, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Text style={{ color: COLORS.primary, fontSize: 12.5, fontWeight: "700" }}>
                  {tr(t, "openLink", "Ouvrir le lien")}
                </Text>
                <Ionicons name="open-outline" size={13} color={COLORS.primary} />
              </TouchableOpacity>
            )}

            <FieldLabel style={{ marginTop: 16 }}>{tr(t, "dateAndTime", "Date et heure")}</FieldLabel>
            <TouchableOpacity
              onPress={() => setShowCalendar(true)}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: SURFACE,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 13,
                borderWidth: 1,
                borderColor: BORDER,
              }}
            >
              <Ionicons name="calendar-outline" size={16} color={MUTED} />
              <Text style={{ color: meetingDate ? INK : "#ABABB2", fontSize: 14, fontWeight: "500" }}>
                {meetingDate
                  ? meetingDate.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
                  : tr(t, "selectDate", "Sélectionner une date")}
              </Text>
            </TouchableOpacity>

            <FieldLabel style={{ marginTop: 16 }}>{tr(t, "reminder", "Rappel")}</FieldLabel>
            <View className="flex-row" style={{ gap: 8 }}>
              {REMINDER_OPTIONS.map((opt) => {
                const active = reminderFrequency === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setReminderFrequency(opt.value)}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      borderRadius: 999,
                      paddingVertical: 10,
                      alignItems: "center",
                      backgroundColor: active ? INK : "#fff",
                      borderWidth: 1.5,
                      borderColor: active ? INK : BORDER,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "#fff" : "#6B6B72" }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FormCard>
        )}

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 16,
            paddingVertical: 15,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            shadowColor: COLORS.primary,
            shadowOpacity: 0.25,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                {tr(t, "save", "Enregistrer")}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onConfirm={(date: Date) => {
          setMeetingDate(date);
          setShowCalendar(false);
        }}
        initialDate={meetingDate || new Date()}
      />

      <ConfirmDeleteModal
        visible={showDeleteModal}
        title={tr(t, "deleteNoteTitle", "Supprimer")}
        message={tr(t, "deleteNoteConfirm", "Voulez-vous vraiment supprimer cet élément ?")}
        itemName={note.title}
        cancelText={tr(t, "cancel", "Annuler")}
        confirmText={tr(t, "delete", "Supprimer")}
        loading={deleting}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
      />

      <SuccessModal
        visible={showSuccessModal}
        title={tr(t, "success", "Succès")}
        message={tr(t, "noteUpdatedMessage", "Les modifications ont été enregistrées.")}
        buttonText={tr(t, "ok", "OK")}
        onClose={() => setShowSuccessModal(false)}
      />

      <ErrorModal
        visible={!!errorModal}
        title={errorModal?.title || tr(t, "error", "Erreur")}
        message={errorModal?.message || ""}
        buttonText={tr(t, "ok", "OK")}
        onClose={() => setErrorModal(null)}
      />
    </SafeAreaView>
  );
}

const FormCard = ({ children }: { children: React.ReactNode }) => (
  <View
    style={{
      backgroundColor: "#fff",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: BORDER,
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    }}
  >
    {children}
  </View>
);

const FieldLabel = ({ children, style }: { children: React.ReactNode; style?: object }) => (
  <Text style={{ fontSize: 12.5, fontWeight: "700", color: MUTED, marginBottom: 8, ...style }}>
    {children}
  </Text>
);

const StyledInput = (props: React.ComponentProps<typeof TextInput>) => (
  <TextInput
    {...props}
    style={[
      {
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: INK,
        fontSize: 14.5,
        fontWeight: "500",
      },
      props.style,
    ]}
    placeholderTextColor="#ABABB2"
  />
);