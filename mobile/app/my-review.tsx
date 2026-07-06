import React, { useState,  useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Header from "@/components/Header";
import { COLORS } from "@/constants";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@clerk/clerk-expo";
import Toast from "react-native-toast-message";
import api from "@/constants/api";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

export default function MyReviewScreen() {
  const { t } = useLanguage();
  const { getToken } = useAuth();

  const [stars, setStars] = useState(0);
  const [review, setReview] = useState("");
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);


  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadRating = useCallback(async () => {
    setFetching(true);
    try {
      const token = await getToken();
      const res = await api.get("/ratings/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data.data;
      if (data) {
        setStars(data.stars);
        setReview(data.review || "");
        setHasExisting(true);
      } else {
        setStars(0);
        setReview("");
        setHasExisting(false);
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: t("error"),
        text2: t("somethingWrong"),
      });
    } finally {
      setFetching(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRating();
    }, [loadRating])
  );

  const onSubmit = async () => {
    if (stars < 1) {
      Toast.show({
        type: "error",
        text1: t("missingFields"),
        text2: t("selectRating"),
      });
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      await api.post(
        "/ratings",
        { stars, review },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHasExisting(true);
      Toast.show({
        type: "success",
        text1: t("reviewSubmitted"),
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: t("error"),
        text2: err?.response?.data?.message ?? t("somethingWrong"),
      });
    } finally {
      setSaving(false);
    }
  };


  const onDelete = () => {
    setShowDeleteModal(true);
  };

  
  const performDelete = async () => {
    setDeleting(true);
    try {
      const token = await getToken();
      await api.delete("/ratings/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStars(0);
      setReview("");
      setHasExisting(false);
      Toast.show({
        type: "success",
        text1: t("reviewDeleted"),
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: t("error"),
        text2: err?.response?.data?.message ?? t("somethingWrong"),
      });
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={t("myReviews")} showBack />

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
      
        <View className="bg-primary/5 border border-primary/10 rounded-2xl p-5 mb-6 items-center">
          <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-3">
            <Ionicons name="star-outline" size={26} color={COLORS.primary} />
          </View>
          <Text className="text-primary font-bold text-lg mb-1 text-center">
            {hasExisting ? t("yourReview") : t("rateUsTitle")}
          </Text>
          <Text className="text-secondary text-sm text-center">
            {t("rateUsSubtitle")}
          </Text>
        </View>

      
        <View className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
          <Text className="text-primary font-medium mb-3">{t("yourRating")}</Text>
          <View className="flex-row justify-center mb-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity key={value} onPress={() => setStars(value)} className="px-1">
                <Ionicons
                  name={value <= stars ? "star" : "star-outline"}
                  size={36}
                  color={value <= stars ? "#FFC107" : COLORS.secondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        
        <View className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <Text className="text-primary font-medium mb-3">{t("yourComment")}</Text>
          <TextInput
            className="w-full bg-surface p-4 rounded-xl text-primary"
            placeholder={t("reviewPlaceholder")}
            placeholderTextColor="#999"
            value={review}
            onChangeText={setReview}
            multiline
            numberOfLines={5}
            maxLength={500}
            style={{ minHeight: 120, textAlignVertical: "top" }}
          />
          <Text className="text-secondary text-xs mt-1 text-right">
            {review.length}/500
          </Text>
        </View>

      
        <TouchableOpacity
          className={`w-full py-4 rounded-full items-center mb-4 ${
            saving || stars < 1 ? "bg-gray-300" : "bg-primary"
          }`}
          onPress={onSubmit}
          disabled={saving || stars < 1}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">
              {hasExisting ? t("updateReview") : t("submitReview")}
            </Text>
          )}
        </TouchableOpacity>

      
        {hasExisting && (
          <TouchableOpacity
            className="w-full py-4 rounded-full items-center mb-10 border border-red-200"
            onPress={onDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color={COLORS.error} />
            ) : (
              <Text className="text-red-500 font-bold text-lg">{t("deleteReview")}</Text>
            )}
          </TouchableOpacity>
        )}

        {!hasExisting && <View className="h-6" />}
      </ScrollView>

      
      <ConfirmDeleteModal
        visible={showDeleteModal}
        title={t("deleteReviewTitle")}
        message={t("deleteReviewConfirm")}
        cancelText={t("cancel")}
        confirmText={t("delete")}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={performDelete}
        loading={deleting}
      />
    </SafeAreaView>
  );
}