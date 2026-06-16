import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { COLORS } from "@/constants";
import { useLanguage } from "@/context/LanguageContext";
import api from "@/constants/api";
import { useAuth } from "@clerk/clerk-expo";


const STAR_LABELS_KEY = [
  "rateStar1",
  "rateStar2",
  "rateStar3",
  "rateStar4",
  "rateStar5",
];

const APP_STORE_ID = "YOUR_APP_STORE_ID";
const PLAY_STORE_ID = "com.helmihamdi.mobile";

export default function RateAppScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { getToken } = useAuth();

  const [selectedStars, setSelectedStars] = useState(0);
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // Charger le rating existant de l'utilisateur (si déjà noté)
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await api.get("/ratings/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.data) {
          setSelectedStars(res.data.data.stars);
          setReview(res.data.data.review ?? "");
        }
      } catch {
        // pas de rating existant — normal
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, []);

  const getStarColor = (stars: number) => {
    if (stars <= 2) return "#ef4444";
    if (stars === 3) return "#f97316";
    if (stars === 4) return "#eab308";
    return "#22c55e";
  };

  const handleSubmit = async () => {
    if (selectedStars === 0) {
      Toast.show({
        type: "error",
        text1: t("rateSelectStars") ?? "Please select a rating",
      });
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      await api.post(
        "/ratings",
        {
          stars: selectedStars,
          review,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSubmitted(true);

      // Si 4 ou 5 étoiles → rediriger vers le store
      if (selectedStars >= 4) {
        setTimeout(() => {
          const url =
            Platform.OS === "ios"
              ? `https://apps.apple.com/app/id${APP_STORE_ID}`
              : `https://play.google.com/store/apps/details?id=${PLAY_STORE_ID}`;
          Linking.openURL(url).catch(() => {});
        }, 1500);
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: t("error") ?? "Error",
        text2:
          err?.response?.data?.message ??
          t("somethingWrong") ??
          "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedStars(0);
    setReview("");
    setSubmitted(false);
  };

  if (loadingExisting) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={["top"]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (submitted) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-primary">
            {t("rateApp") ?? "Rate the App"}
          </Text>
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: "#22c55e15" }}
          >
            <Ionicons name="checkmark-circle" size={56} color="#22c55e" />
          </View>
          <Text className="text-2xl font-bold text-primary mb-3 text-center">
            {t("rateThanksTitle") ?? "Thank you! 🎉"}
          </Text>
          <Text className="text-secondary text-center text-sm leading-6 mb-8">
            {selectedStars >= 4
              ? t("rateThanksHigh") ??
                "We're thrilled you love the app! Redirecting you to leave a review..."
              : t("rateThanksLow") ??
                "We appreciate your feedback. We'll work hard to improve your experience."}
          </Text>

          <View className="flex-row gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons
                key={s}
                name={s <= selectedStars ? "star" : "star-outline"}
                size={32}
                color={
                  s <= selectedStars ? getStarColor(selectedStars) : "#d1d5db"
                }
              />
            ))}
          </View>

          <TouchableOpacity
            className="px-8 py-3 rounded-full border border-gray-200"
            onPress={handleReset}
          >
            <Text className="text-secondary font-medium">
              {t("rateAgain") ?? "Rate Again"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-primary">
          {t("rateApp") ?? "Rate the App"}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="items-center mb-10">
          <View
            className="w-24 h-24 rounded-3xl items-center justify-center mb-5 shadow-sm"
            style={{ backgroundColor: COLORS.primary + "15" }}
          >
            <Ionicons name="star" size={44} color={COLORS.primary} />
          </View>
          <Text className="text-2xl font-bold text-primary mb-2 text-center">
            {t("rateTitle") ?? "Enjoying the app?"}
          </Text>
          <Text className="text-secondary text-center text-sm px-4 leading-6">
            {t("rateSubtitle") ??
              "Your feedback helps us improve. Let us know what you think!"}
          </Text>
        </View>

        {/* Stars */}
        <View className="items-center mb-4">
          <View className="flex-row gap-3 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setSelectedStars(star)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={star <= selectedStars ? "star" : "star-outline"}
                  size={44}
                  color={
                    star <= selectedStars
                      ? getStarColor(selectedStars)
                      : "#d1d5db"
                  }
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text
            className="text-sm font-semibold mt-1"
            style={{
              color:
                selectedStars > 0 ? getStarColor(selectedStars) : "#9ca3af",
            }}
          >
            {selectedStars > 0
              ? t(STAR_LABELS_KEY[selectedStars - 1]) ??
                ["Terrible", "Bad", "Okay", "Good", "Excellent!"][
                  selectedStars - 1
                ]
              : t("rateTapToRate") ?? "Tap to rate"}
          </Text>
        </View>

        <View className="border-t border-gray-100 my-6" />

        {/* Review */}
        <View className="mb-6">
          <Text className="text-primary font-medium mb-2">
            {t("rateReviewLabel") ?? "Write a review (optional)"}
          </Text>
          <TextInput
            className="bg-gray-50 rounded-xl p-4 text-primary min-h-[120px]"
            placeholder={
              t("rateReviewPlaceholder") ?? "Tell us what you think..."
            }
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
            textAlign={isRTL ? "right" : "left"}
            value={review}
            onChangeText={setReview}
            maxLength={500}
          />
          <Text className="text-xs text-secondary text-right mt-1">
            {review.length}/500
          </Text>
        </View>

        {/* Quick chips */}
        {selectedStars > 0 && (
          <View className="mb-6">
            <Text className="text-primary font-medium mb-3">
              {t("rateQuickFeedback") ?? "Quick feedback"}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {(selectedStars >= 4
                ? [
                    t("chipEasyToUse") ?? "Easy to use",
                    t("chipGreatDesign") ?? "Great design",
                    t("chipFastPerformance") ?? "Fast performance",
                    t("chipLoveProducts") ?? "Love the products",
                    t("chipGreatPrices") ?? "Great prices",
                  ]
                : [
                    t("chipSlowApp") ?? "App is slow",
                    t("chipHardToNavigate") ?? "Hard to navigate",
                    t("chipBuggy") ?? "Buggy experience",
                    t("chipNeedMoreProducts") ?? "Need more products",
                    t("chipBetterSearch") ?? "Better search",
                  ]
              ).map((chip) => {
                const selected = review.includes(chip);
                return (
                  <TouchableOpacity
                    key={chip}
                    className="px-4 py-2 rounded-full border"
                    style={{
                      backgroundColor: selected
                        ? COLORS.primary + "15"
                        : "#f9fafb",
                      borderColor: selected ? COLORS.primary : "#e5e7eb",
                    }}
                    onPress={() => {
                      if (selected) {
                        setReview((prev) =>
                          prev
                            .replace(chip, "")
                            .replace(/,\s*,/g, ",")
                            .replace(/^,\s*|,\s*$/g, "")
                            .trim()
                        );
                      } else {
                        setReview((prev) =>
                          prev ? `${prev}, ${chip}` : chip
                        );
                      }
                    }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{
                        color: selected ? COLORS.primary : "#6b7280",
                      }}
                    >
                      {chip}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          className="w-full py-4 rounded-full items-center mb-10"
          style={{
            backgroundColor:
              selectedStars === 0 ? "#e5e7eb" : COLORS.primary,
          }}
          onPress={handleSubmit}
          disabled={selectedStars === 0 || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              className="font-bold text-lg"
              style={{
                color: selectedStars === 0 ? "#9ca3af" : "#fff",
              }}
            >
              {t("rateSubmit") ?? "Submit Review"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}