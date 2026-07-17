import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import { COLORS } from "@/constants";

const SURFACE = "#F5F5F8";
const TILE = 84;

type Props = {
  existingImages: string[]; // déjà uploadées (édition)
  newImages: string[]; // URIs locales pas encore uploadées
  onRemoveExisting: (url: string) => void;
  onRemoveNew: (uri: string) => void;
  onAdd: (uri: string) => void;
  max?: number;
  addLabel: string;
  limitLabel: string;
  permissionDeniedTitle: string;
  permissionDeniedMessage: string;
};

export default function OfferImagesPicker({
  existingImages,
  newImages,
  onRemoveExisting,
  onRemoveNew,
  onAdd,
  max = 10,
  addLabel,
  limitLabel,
  permissionDeniedTitle,
  permissionDeniedMessage,
}: Props) {
  const total = existingImages.length + newImages.length;
  const canAddMore = total < max;

  const pickImage = async () => {
    if (!canAddMore) {
      Toast.show({ type: "info", text1: limitLabel });
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Toast.show({
        type: "error",
        text1: permissionDeniedTitle,
        text2: permissionDeniedMessage,
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      onAdd(result.assets[0].uri);
    }
  };

  return (
    <View className="mb-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {existingImages.map((url) => (
            <View key={url} style={{ width: TILE, height: TILE }}>
              <Image
                source={{ uri: url }}
                style={{ width: "100%", height: "100%", borderRadius: 12 }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => onRemoveExisting(url)}
                hitSlop={8}
                style={{ position: "absolute", top: -6, right: -6 }}
              >
                <Ionicons name="close-circle" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}

          {newImages.map((uri) => (
            <View key={uri} style={{ width: TILE, height: TILE }}>
              <Image
                source={{ uri }}
                style={{ width: "100%", height: "100%", borderRadius: 12 }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => onRemoveNew(uri)}
                hitSlop={8}
                style={{ position: "absolute", top: -6, right: -6 }}
              >
                <Ionicons name="close-circle" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}

          {canAddMore && (
            <TouchableOpacity
              onPress={pickImage}
              style={{
                width: TILE,
                height: TILE,
                borderRadius: 12,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: COLORS.primary,
                backgroundColor: SURFACE,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="add" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Text style={{ fontSize: 11, color: "#8D8D96", marginTop: 6 }}>
        {addLabel} ({total}/{max})
      </Text>
    </View>
  );
}