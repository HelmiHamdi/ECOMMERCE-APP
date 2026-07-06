import React, { useEffect, useRef } from "react";
import { Text, TouchableOpacity, View, Modal, Animated, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";

interface RestartRequiredModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
}

export default function RestartRequiredModal({
  visible,
  title,
  message,
  confirmText,
  onConfirm,
}: RestartRequiredModalProps) {
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
      onRequestClose={onConfirm}
    >
      <Pressable
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
              style={{ backgroundColor: `${COLORS.primary}1A` }}
            >
              <Ionicons name="refresh-outline" size={30} color={COLORS.primary} />
            </View>

            <Text className="text-lg font-bold text-primary text-center mb-1">
              {title}
            </Text>

            <Text className="text-sm text-secondary text-center mb-5">
              {message}
            </Text>

        
            <TouchableOpacity
              onPress={onConfirm}
              className="w-full py-3 rounded-2xl items-center"
              style={{ backgroundColor: COLORS.primary }}
              activeOpacity={0.85}
            >
              <Text className="font-semibold text-white">{confirmText}</Text>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}