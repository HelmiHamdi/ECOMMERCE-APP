import { COLORS } from "@/constants";
import api from "@/constants/api";
import { NoteType, ReminderFrequency } from "@/constants/types";
import { emitNotesChanged } from "@/constants/noteEvents";
import { tr } from "@/constants/translations/translate";
import { normalizeUrl, openMeetingLink } from "@/constants/meetingLink";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CalendarModal from "@/components/CalendarModal";
import SuccessModal from "@/components/SuccessModal";
import ErrorModal from "@/components/ErrorModal";
import RichTextEditor from "@/components/RichTextEditor";
import { useLanguage } from "@/context/LanguageContext";

const INK = "#13131A";
const MUTED = "#8D8D96";
const SURFACE = "#F5F5F8";
const BORDER = "#ECECF1";
const ACCENT_SOFT = "#F0F0F2";

export default function CreateNoteScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [type, setType] = useState<NoteType>("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingDate, setMeetingDate] = useState<Date | null>(null);
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>("none");
  const [showCalendar, setShowCalendar] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);

  const REMINDER_OPTIONS: { label: string; value: ReminderFrequency }[] = [
    { label: tr(t, "reminderNone", "Aucun"), value: "none" },
    { label: tr(t, "reminderDaily", "Chaque jour"), value: "daily" },
    { label: tr(t, "reminderHourly", "Chaque heure"), value: "hourly" },
  ];

  const accent = INK;

  const showError = (title: string, message: string) => {
    setErrorModal({ title, message });
  };

  const handleOpenLink = () => {
    openMeetingLink(
      meetingLink,
      showError,
      tr(t, "error", "Erreur"),
      tr(t, "cannotOpenLink", "Ce lien n'est pas valide ou ne peut pas être ouvert. Vérifiez son format.")
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showError(tr(t, "error", "Erreur"), tr(t, "titleRequired", "Le titre est requis"));
      return;
    }
    if (type === "meeting" && !meetingDate) {
      showError(
        tr(t, "error", "Erreur"),
        tr(t, "selectMeetingDate", "Sélectionnez la date de la réunion")
      );
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/notes", {
        title: title.trim(),
        content: content,
        type,
        meetingLink: type === "meeting" ? normalizeUrl(meetingLink) || null : null,
        meetingDate: type === "meeting" && meetingDate ? meetingDate.toISOString() : null,
        reminderFrequency: type === "meeting" ? reminderFrequency : "none",
      });

      if (!data?.success) {
        throw new Error(data?.message || "Création échouée");
      }

      emitNotesChanged({ action: "create", note: data.data });
      setShowSuccess(true);
    } catch (err: any) {
      console.error("CREATE NOTE ERROR:", err?.response?.data || err.message);
      showError(
        tr(t, "error", "Erreur"),
        err?.response?.data?.message ||
          tr(t, "cannotCreateNote", "Impossible de créer la note")
      );
    } finally {
      setSubmitting(false);
    }
  };

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
            {tr(t, "admin", "Admin")}
          </Text>
          <Text style={{ fontSize: 26, fontWeight: "800", color: INK, letterSpacing: -0.5, marginTop: 1 }}>
            {tr(t, "newNote", "Nouvelle note")}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type toggle */}
        <View className="flex-row" style={{ gap: 10 }}>
          <TypeToggleButton
            active={type === "note"}
            icon="document-text-outline"
            label={tr(t, "note", "Note")}
            color={INK}
            softColor={ACCENT_SOFT}
            onPress={() => setType("note")}
          />
          <TypeToggleButton
            active={type === "meeting"}
            icon="videocam-outline"
            label={tr(t, "meeting", "Réunion")}
            color={INK}
            softColor={ACCENT_SOFT}
            onPress={() => setType("meeting")}
          />
        </View>

        {/* Champs principaux */}
        <FormCard>
          <FieldLabel>{tr(t, "title", "Titre")}</FieldLabel>
          <StyledInput
            value={title}
            onChangeText={setTitle}
            placeholder={tr(t, "noteTitlePlaceholder", "Titre de la note")}
          />

          <FieldLabel style={{ marginTop: 16 }}>{tr(t, "content", "Contenu")}</FieldLabel>
          <RichTextEditor
            initialHTML={content}
            onChangeHTML={setContent}
            placeholder={tr(t, "noteContentPlaceholder", "Écrire votre note...")}
            minHeight={160}
          />
        </FormCard>

        {type === "meeting" && (
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
                placeholder="https://meet.google.com/..."
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
                style={{
                  marginTop: 8,
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
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
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
          style={{
            backgroundColor: accent,
            borderRadius: 16,
            paddingVertical: 15,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            shadowColor: accent,
            shadowOpacity: 0.25,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                {type === "meeting"
                  ? tr(t, "createMeeting", "Créer la réunion")
                  : tr(t, "createNote", "Créer la note")}
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

      <SuccessModal
        visible={showSuccess}
        title={tr(t, "success", "Succès")}
        message={
          type === "meeting"
            ? tr(t, "meetingCreatedMessage", "La réunion a été créée avec succès.")
            : tr(t, "noteCreatedMessage", "La note a été créée avec succès.")
        }
        buttonText={tr(t, "ok", "OK")}
        onClose={() => {
          setShowSuccess(false);
          router.back();
        }}
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

const TypeToggleButton = ({
  active,
  icon,
  label,
  color,
  softColor,
  onPress,
}: {
  active: boolean;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  color: string;
  softColor: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={{
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 16,
      paddingVertical: 14,
      backgroundColor: active ? softColor : "#fff",
      borderWidth: 1.5,
      borderColor: active ? color : BORDER,
    }}
  >
    <Ionicons name={icon} size={18} color={active ? color : MUTED} />
    <Text style={{ fontWeight: "700", fontSize: 14, color: active ? color : MUTED }}>{label}</Text>
  </TouchableOpacity>
);

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