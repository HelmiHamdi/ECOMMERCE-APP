import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Modal,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { COLORS } from "@/constants";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/constants/api";


type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatBot() {
  const { t, isRTL } = useLanguage();
  const { getToken, isSignedIn } = useAuth();

  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse continu sur la bulle flottante
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    setMessages([{ role: "assistant", content: t("chatWelcome") }]);
  }, [t]);

  const openChat = () => {
    setVisible(true);
    slideAnim.setValue(0);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeChat = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const headers: any = {};
      if (isSignedIn) {
        const token = await getToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await api.post(
        "/chat",
        {
          message: text,
          history: newMessages
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content })),
        },
        { headers }
      );

      setMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("chatError") },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  const overlayOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <>
      {/* Floating Button (pulse animation) */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: 200,
          right: 20,
          transform: [{ scale: pulseAnim }],
          zIndex: 50,
          elevation: 999,
        }}
      >
        <TouchableOpacity
          onPress={openChat}
          className="bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg"
          style={{ elevation: 6 }}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Chat Modal */}
      <Modal visible={visible} animationType="none" transparent onRequestClose={closeChat}>
        <Animated.View
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", opacity: overlayOpacity }}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={closeChat}
          />
        </Animated.View>

        <Animated.View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "75%",
            transform: [{ translateY }],
          }}
        >
          {/* ✅ FIX 1: behavior="height" على Android + style={{ flex: 1 }} بدل className flex-1 */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="bg-white rounded-t-3xl"
            style={{ flex: 1, elevation: 10 }}
          >
            {/* Drag handle */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </View>

            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-9 h-9 bg-primary/10 rounded-full items-center justify-center mr-3">
                  <Ionicons name="storefront-outline" size={18} color={COLORS.primary} />
                </View>
                <View>
                  <Text className="text-primary font-bold text-base">
                    {t("chatBotName")}
                  </Text>
                  <Text className="text-secondary text-xs">{t("chatBotOnline")}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={closeChat}>
                <Ionicons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => (
                <View
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    item.role === "user"
                      ? "bg-primary self-end rounded-br-md"
                      : "bg-surface self-start rounded-bl-md"
                  }`}
                >
                  <Text
                    className={`text-sm leading-5 ${
                      item.role === "user" ? "text-white" : "text-primary"
                    }`}
                  >
                    {item.content}
                  </Text>
                </View>
              )}
            />

            {loading && (
              <View className="px-4 pb-2">
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            )}

            {/* ✅ FIX 2: paddingBottom على Android لضمان ما يتخبّاش الـ input */}
            <View
              className="flex-row items-center px-4 py-3 border-t border-gray-100"
              style={{ paddingBottom: Platform.OS === "android" ? 12 : 0 }}
            >
              <TextInput
                className="flex-1 bg-surface rounded-full px-4 py-3 text-primary mr-2"
                placeholder={t("chatPlaceholder")}
                placeholderTextColor="#999"
                value={input}
                onChangeText={setInput}
                onSubmitEditing={sendMessage}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={sendMessage}
                disabled={loading || !input.trim()}
                className={`w-11 h-11 rounded-full items-center justify-center ${
                  loading || !input.trim() ? "bg-gray-300" : "bg-primary"
                }`}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </>
  );
}