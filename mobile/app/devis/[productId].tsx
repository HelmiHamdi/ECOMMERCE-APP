import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import Header from "@/components/Header";
import api from "@/constants/api";
import { DevisPayload } from "@/constants/types";
import { useLanguage } from "@/context/LanguageContext";
import { COLORS } from "@/constants";
import { DEVIS_COLORS } from "@/constants/devisTheme";

export default function DevisRequestScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const { getToken } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [size, setSize] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !message.trim()) {
      Alert.alert(
        t("devisRequiredFields") ?? "Champs requis",
        t("devisRequiredFieldsMessage") ?? "Nom, téléphone et message sont obligatoires",
      );
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const payload: DevisPayload = {
        product: productId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        quantity: Number(quantity) || 1,
        size: size.trim() || undefined,
        message: message.trim(),
      };
      await api.post("/devis", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert(
        t("devisSentTitle") ?? "Demande envoyée",
        t("devisSentMessage") ?? "Nous vous répondrons dans les plus brefs délais",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error: any) {
      Alert.alert(
        t("error") ?? "Erreur",
        error?.response?.data?.message ||
          (t("devisSubmitError") ?? "Impossible d'envoyer la demande"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Header title={t("devisRequest") ?? "Demande de devis"} showBack />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* ------- Intro (remplace le bandeau plein écran) ------- */}
          <View
            className="flex-row items-center rounded-2xl p-4 mb-5"
            style={{ backgroundColor: DEVIS_COLORS.surface }}
          >
            <View
              className="w-11 h-11 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: `${COLORS.primary}1A` }}
            >
              <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-[13px]" style={{ color: DEVIS_COLORS.ink }}>
                {t("devisRequest") ?? "Demande de devis"}
              </Text>
              <Text className="text-[11px] mt-0.5" style={{ color: DEVIS_COLORS.muted }}>
                {t("devisRequestSubtitle") ??
                  "Remplissez le formulaire, nous vous répondrons rapidement"}
              </Text>
            </View>
          </View>

          <Field
            label={t("devisFullName") ?? "Nom complet"}
            required
            value={name}
            onChangeText={setName}
            placeholder="Votre nom"
          />

          <Field
            label={t("devisPhone") ?? "Téléphone"}
            required
            value={phone}
            onChangeText={setPhone}
            placeholder="+216 00 000 000"
            keyboardType="phone-pad"
          />

          <Field
            label={t("devisEmail") ?? "Email"}
            value={email}
            onChangeText={setEmail}
            placeholder="exemple@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <Field
                label={t("devisQuantity") ?? "Quantité"}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <Field
                label={t("devisSize") ?? "Taille"}
                value={size}
                onChangeText={setSize}
                placeholder="Optionnel"
              />
            </View>
          </View>

          <Text className="text-[13px] font-semibold mb-2" style={{ color: "#4A4A4F" }}>
            {t("devisMessage") ?? "Message"} <Text style={{ color: "#EF4444" }}>*</Text>
          </Text>
          <TextInput
            className="rounded-2xl px-4 py-3 mb-5"
            style={{
              backgroundColor: DEVIS_COLORS.surface,
              color: DEVIS_COLORS.ink,
              minHeight: 100,
              textAlignVertical: "top",
            }}
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder={t("devisMessagePlaceholder") ?? "Décrivez votre besoin..."}
            placeholderTextColor="#ABABB2"
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            className="rounded-full py-4 items-center flex-row justify-center"
            style={{ backgroundColor: submitting ? "#EDEDF0" : COLORS.primary }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                <Text className="text-white font-bold text-[15px] ml-2">
                  {t("devisSubmit") ?? "Envoyer la demande"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address" | "numeric";
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View className="mb-4">
      <Text className="text-[13px] font-semibold mb-2" style={{ color: "#4A4A4F" }}>
        {label} {required && <Text style={{ color: "#EF4444" }}>*</Text>}
      </Text>
      <TextInput
        className="rounded-2xl px-4 py-3"
        style={{ backgroundColor: DEVIS_COLORS.surface, color: DEVIS_COLORS.ink }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#ABABB2"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}