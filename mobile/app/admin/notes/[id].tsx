import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Trash2, Save, Video, Link as LinkIcon } from "lucide-react-native";
import { getNoteById, updateNote, deleteNote } from "@/constants/notes";
import { Note, ReminderFrequency } from "@/constants/types";
import MeetingCountdown from "../../../components/MeetingCountdown";
import CalendarModal from "../../../components/CalendarModal";

const REMINDER_OPTIONS: { label: string; value: ReminderFrequency }[] = [
  { label: "Aucun", value: "none" },
  { label: "Chaque jour", value: "daily" },
  { label: "Chaque heure", value: "hourly" },
];

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingDate, setMeetingDate] = useState<Date | null>(null);
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>("none");
  const [showCalendar, setShowCalendar] = useState(false);

  const fetchNote = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getNoteById(id);
      setNote(data);
      setTitle(data.title);
      setContent(data.content || "");
      setMeetingLink(data.meetingLink || "");
      setMeetingDate(data.meetingDate ? new Date(data.meetingDate) : null);
      setReminderFrequency(data.reminderFrequency);
    } catch (err) {
      console.error("Erreur chargement note:", err);
      Alert.alert("Erreur", "Impossible de charger cette note");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useFocusEffect(
    useCallback(() => {
      fetchNote();
    }, [fetchNote])
  );

  const handleSave = async () => {
    if (!note) return;
    if (!title.trim()) {
      Alert.alert("Erreur", "Le titre est requis");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateNote(note._id, {
        title: title.trim(),
        content: content.trim(),
        meetingLink: note.type === "meeting" ? meetingLink.trim() : undefined,
        meetingDate:
          note.type === "meeting" && meetingDate ? meetingDate.toISOString() : undefined,
        reminderFrequency: note.type === "meeting" ? reminderFrequency : undefined,
      });
      setNote(updated);
      Alert.alert("Succès", "Note mise à jour");
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.message || "Impossible de mettre à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!note) return;
    Alert.alert("Supprimer", "Voulez-vous vraiment supprimer cette note ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNote(note._id);
            router.back();
          } catch (err: any) {
            Alert.alert("Erreur", err?.response?.data?.message || "Suppression impossible");
          }
        },
      },
    ]);
  };

  if (loading || !note) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          {note.createdBy?.image ? (
            <Image source={{ uri: note.createdBy.image }} className="w-8 h-8 rounded-full" />
          ) : (
            <View className="w-8 h-8 rounded-full bg-gray-200" />
          )}
          <Text className="text-sm text-gray-500">Par {note.createdBy?.name}</Text>
        </View>

        <TouchableOpacity onPress={handleDelete} className="p-2">
          <Trash2 size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {note.type === "meeting" && note.meetingDate && (
        <View className="flex-row items-center gap-2">
          <Video size={16} color="#059669" />
          <MeetingCountdown targetDate={meetingDate || note.meetingDate} />
        </View>
      )}

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-1">Titre</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          className="border border-gray-300 rounded-xl px-4 py-3"
        />
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-1">Contenu</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          className="border border-gray-300 rounded-xl px-4 py-3 min-h-[120px]"
        />
      </View>

      {note.type === "meeting" && (
        <>
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Lien de réunion</Text>
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4">
              <LinkIcon size={16} color="#9ca3af" />
              <TextInput
                value={meetingLink}
                onChangeText={setMeetingLink}
                autoCapitalize="none"
                className="flex-1 py-3 px-2"
              />
            </View>
            {!!meetingLink && (
              <TouchableOpacity
                onPress={() => Linking.openURL(meetingLink)}
                className="mt-2 self-start"
              >
                <Text className="text-blue-600 text-sm">Ouvrir le lien →</Text>
              </TouchableOpacity>
            )}
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Date et heure</Text>
            <TouchableOpacity
              onPress={() => setShowCalendar(true)}
              className="border border-gray-300 rounded-xl px-4 py-3"
            >
              <Text>
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
                      reminderFrequency === opt.value
                        ? "text-white text-xs"
                        : "text-gray-500 text-xs"
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
        onPress={handleSave}
        disabled={saving}
        className="bg-black rounded-xl py-4 items-center flex-row justify-center gap-2 mt-4"
      >
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Save size={18} color="white" />
            <Text className="text-white font-semibold">Enregistrer</Text>
          </>
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