import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { StickyNote, Video, Link as LinkIcon } from "lucide-react-native";
import { createNote } from "@/constants/notes";
import { NoteType, ReminderFrequency } from "@/constants/types";
import CalendarModal from "../../../components/CalendarModal";


const REMINDER_OPTIONS: { label: string; value: ReminderFrequency }[] = [
  { label: "Aucun", value: "none" },
  { label: "Chaque jour", value: "daily" },
  { label: "Chaque heure", value: "hourly" },
];

export default function CreateNoteScreen() {
  const router = useRouter();
  const [type, setType] = useState<NoteType>("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingDate, setMeetingDate] = useState<Date | null>(null);
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>("none");
  const [showCalendar, setShowCalendar] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Erreur", "Le titre est requis");
      return;
    }
    if (type === "meeting" && !meetingDate) {
      Alert.alert("Erreur", "Sélectionnez la date de la réunion");
      return;
    }

    setSubmitting(true);
    try {
      await createNote({
        title: title.trim(),
        content: content.trim(),
        type,
        meetingLink: type === "meeting" ? meetingLink.trim() : undefined,
        meetingDate: type === "meeting" && meetingDate ? meetingDate.toISOString() : undefined,
        reminderFrequency: type === "meeting" ? reminderFrequency : undefined,
      });
      router.back();
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.message || "Impossible de créer la note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={() => setType("note")}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 border ${
            type === "note" ? "bg-black border-black" : "border-gray-300"
          }`}
        >
          <StickyNote size={18} color={type === "note" ? "white" : "#6b7280"} />
          <Text className={type === "note" ? "text-white font-semibold" : "text-gray-500"}>
            Note
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setType("meeting")}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 border ${
            type === "meeting" ? "bg-black border-black" : "border-gray-300"
          }`}
        >
          <Video size={18} color={type === "meeting" ? "white" : "#6b7280"} />
          <Text className={type === "meeting" ? "text-white font-semibold" : "text-gray-500"}>
            Réunion
          </Text>
        </TouchableOpacity>
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-1">Titre</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Titre de la note"
          className="border border-gray-300 rounded-xl px-4 py-3"
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-1">Contenu</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Écrire votre note..."
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          className="border border-gray-300 rounded-xl px-4 py-3 min-h-[120px]"
        />
      </View>

      {type === "meeting" && (
        <>
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Lien de réunion</Text>
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4">
              <LinkIcon size={16} color="#9ca3af" />
              <TextInput
                value={meetingLink}
                onChangeText={setMeetingLink}
                placeholder="https://meet.google.com/..."
                autoCapitalize="none"
                className="flex-1 py-3 px-2"
              />
            </View>
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Date et heure</Text>
            <TouchableOpacity
              onPress={() => setShowCalendar(true)}
              className="border border-gray-300 rounded-xl px-4 py-3"
            >
              <Text className={meetingDate ? "text-black" : "text-gray-400"}>
                {meetingDate
                  ? meetingDate.toLocaleString("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "Sélectionner une date"}
              </Text>
            </TouchableOpacity>
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Rappel</Text>
            <View className="flex-row gap-2">
              {REMINDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setReminderFrequency(opt.value)}
                  className={`flex-1 rounded-xl py-2 items-center border ${
                    reminderFrequency === opt.value
                      ? "bg-black border-black"
                      : "border-gray-300"
                  }`}
                >
                  <Text
                    className={
                      reminderFrequency === opt.value ? "text-white text-xs" : "text-gray-500 text-xs"
                    }
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        className="bg-black rounded-xl py-4 items-center mt-4"
      >
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold">
            {type === "meeting" ? "Créer la réunion" : "Créer la note"}
          </Text>
        )}
      </TouchableOpacity>

      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        onConfirm={(date: Date) => {
          setMeetingDate(date);
          setShowCalendar(false);
        }}
        initialDate={meetingDate || new Date()}
      />
    </ScrollView>
  );
}