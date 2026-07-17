import React from "react";
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ImageViewerModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

export default function ImageViewerModal({
  visible,
  imageUri,
  onClose,
}: ImageViewerModalProps) {
  if (!imageUri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {/* Zone cliquable pour fermer (en dehors de l'image) */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            source={{ uri: imageUri }}
            style={{
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT * 0.8,
            }}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <SafeAreaView
          style={{ position: "absolute", top: 0, right: 0 }}
          edges={["top"]}
        >
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
              margin: 16,
            }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}