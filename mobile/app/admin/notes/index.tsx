import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Plus, Video, StickyNote } from "lucide-react-native";

import MeetingCountdown from "../../../components/MeetingCountdown";
import { Note } from "@/constants/types";
import { getNotes } from "@/constants/notes";

export default function NotesListScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    try {
      const data = await getNotes();
      setNotes(data);
    } catch (err) {
      console.error("Erreur chargement notes:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotes();
    }, [fetchNotes])
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={notes}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchNotes();
            }}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center mt-20">
            <StickyNote size={40} color="#d1d5db" />
            <Text className="text-center text-gray-400 mt-3">
              Aucune note pour le moment
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/admin/notes/[id]",
                params: { id: item._id },
              })
            }
            className="border border-gray-200 rounded-2xl p-4"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-2 mb-2">
              {item.type === "meeting" ? (
                <Video size={16} color="#059669" />
              ) : (
                <StickyNote size={16} color="#6366f1" />
              )}
              <Text className="font-semibold text-base flex-1" numberOfLines={1}>
                {item.title}
              </Text>
            </View>

            {item.content ? (
              <Text className="text-gray-500 text-sm mb-2" numberOfLines={2}>
                {item.content}
              </Text>
            ) : null}

            {item.type === "meeting" && item.meetingDate && (
              <MeetingCountdown targetDate={item.meetingDate} />
            )}

            <View className="flex-row items-center gap-2 mt-3">
              {item.createdBy?.image ? (
                <Image
                  source={{ uri: item.createdBy.image }}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <View className="w-6 h-6 rounded-full bg-gray-200" />
              )}
              <Text className="text-xs text-gray-400">
                {item.createdBy?.name || "Admin"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        onPress={() => router.push("/admin/notes/create")}
        className="absolute bottom-6 right-6 bg-black w-14 h-14 rounded-full items-center justify-center shadow-lg"
        activeOpacity={0.8}
      >
        <Plus size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}