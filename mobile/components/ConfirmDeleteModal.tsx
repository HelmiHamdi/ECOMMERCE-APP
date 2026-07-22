import React, { useEffect, useRef } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  Modal,
  Animated,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ConfirmDeleteModalProps {
  visible: boolean;
  title: string;
  message: string;
  itemName?: string;
  cancelText: string;
  confirmText: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function ConfirmDeleteModal({
  visible,
  title,
  message,
  itemName,
  cancelText,
  confirmText,
  onCancel,
  onConfirm,
  loading = false,
}: ConfirmDeleteModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 28,
        }}
      >
        <Animated.View
          style={{
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
            width: "100%",
          }}
        >
         
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 items-center"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
          
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: "#FEE2E2" }}
            >
              <Ionicons name="trash-outline" size={30} color="#DC2626" />
            </View>

            <Text className="text-lg font-bold text-primary text-center mb-1">
              {title}
            </Text>

            <Text className="text-sm text-secondary text-center mb-1">
              {message}
            </Text>

            {itemName ? (
              <Text
                className="text-sm font-semibold text-primary text-center mb-5"
                numberOfLines={1}
              >
               &quot;{itemName}&quot;
              </Text>
            ) : (
              <View className="mb-5" />
            )}

          
            <View className="flex-row w-full" style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={onCancel}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl items-center bg-gray-100"
                activeOpacity={0.7}
              >
                <Text className="font-semibold text-primary">
                  {cancelText}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onConfirm}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl items-center"
                style={{
                  backgroundColor: "#DC2626",
                  opacity: loading ? 0.6 : 1,
                }}
                activeOpacity={0.85}
              >
                <Text className="font-semibold text-white">
                  {loading ? "..." : confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}