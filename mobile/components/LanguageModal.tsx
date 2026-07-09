import React, { useEffect, useRef } from "react";
import { Text, TouchableOpacity, View, Modal, Animated, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";
import { Language } from "@/context/LanguageContext";

interface LanguageOption {
  code: Language;
  nameKey: string;
  flag: string;
}

interface LanguageModalProps {
  visible: boolean;
  title: string;
  languages: LanguageOption[];
  selectedLanguage: Language;
  t: (key: string) => string;
  onSelect: (lang: Language) => void;
  onClose: () => void;
}

export default function LanguageModal({
  visible,
  title,
  languages,
  selectedLanguage,
  t,
  onSelect,
  onClose,
}: LanguageModalProps) {
  const translateY = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 9,
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
      translateY.setValue(300);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", marginBottom: 20 }}
      >
        <Animated.View
          style={{
            opacity: opacityAnim,
            transform: [{ translateY }],
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-5 pb-8"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 10,
            }}
          >
           
            <View
              className="self-center rounded-full mb-4"
              style={{ width: 40, height: 4, backgroundColor: "#E5E7EB" }}
            />

            <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-gray-100">
              <Text className="text-lg font-bold text-primary">{title}</Text>
              <TouchableOpacity
                onPress={onClose}
                className="w-8 h-8 rounded-full items-center justify-center bg-gray-100"
              >
                <Ionicons name="close" size={18} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            {languages.map((lang) => {
              const isSelected = selectedLanguage === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  className={`p-4 rounded-2xl mb-2 flex-row justify-between items-center ${
                    isSelected ? "bg-primary/10" : "bg-gray-50"
                  }`}
                  onPress={() => onSelect(lang.code)}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center">
                    <View
                      className="w-9 h-9 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: isSelected ? `${COLORS.primary}1A` : "#EFEFEF" }}
                    >
                      <Text className="text-lg">{lang.flag}</Text>
                    </View>
                    <Text
                      className={`font-medium ${
                        isSelected ? "text-primary font-bold" : "text-secondary"
                      }`}
                    >
                      {t(lang.nameKey)}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}