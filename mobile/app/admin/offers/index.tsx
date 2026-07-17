import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import Header from "@/components/Header";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import ImageCarouselModal from "@/components/ImageCarouselModal";
import { COLORS } from "@/constants";
import { useAuth } from "@clerk/clerk-expo";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import api from "@/constants/api";

type OfferProduct = {
  _id: string;
  name: string;
  images?: string[];
};

type Offer = {
  _id: string;
  title: string;
  description: string;
  images?: string[]; // 👈 AJOUT — images propres (offre "libre")
  code: string;
  originalPrice: number;
  discountPercentage: number;
  finalPrice: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  product: OfferProduct | string | null; // 👈 populate côté backend renvoie un objet, sinon juste l'id, sinon null
};

// 👇 AJOUT — si un produit est lié, on affiche SES images ; sinon celles de
// l'offre elle-même (offre "libre")
const getDisplayImages = (offer: Offer): string[] => {
  if (
    offer.product &&
    typeof offer.product === "object" &&
    Array.isArray(offer.product.images) &&
    offer.product.images.length > 0
  ) {
    return offer.product.images;
  }
  if (Array.isArray(offer.images) && offer.images.length > 0) {
    return offer.images;
  }
  return [];
};

export default function AdminOffersScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();

  const tf = (key: string, fallback: string) => {
    const val = t(key as any);
    if (!val || typeof val !== "string" || val.toLowerCase().includes("missing")) {
      return fallback;
    }
    return val;
  };

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  const [carousel, setCarousel] = useState<{ images: string[]; index: number } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadOffers = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await api.get("/offers/admin/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOffers(res.data.data);
    } catch (err: any) {
      console.error(err);
      Toast.show({
        type: "error",
        text1: tf("error", "Erreur"),
        text2: err?.response?.data?.message ?? tf("somethingWrong", "Une erreur s'est produite"),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOffers();
    }, [loadOffers])
  );

  // ------- L'offre est visible côté client si active ET si aujourd'hui est compris dans [startDate, endDate] -------
  const isCurrentlyValid = (offer: Offer) => {
    const now = new Date();
    return (
      offer.isActive &&
      new Date(offer.startDate) <= now &&
      new Date(offer.endDate) >= now
    );
  };

  // 👇 Récupère le nom du produit lié, que "product" soit populate, id brut, ou null
  const getProductName = (offer: Offer) => {
    if (offer.product && typeof offer.product === "object") {
      return offer.product.name;
    }
    return null;
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = await getToken();
      await api.delete(`/offers/${deleteTarget._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Toast.show({ type: "success", text1: tf("offerDeleted", "Offre supprimée") });
      setOffers((prev) => prev.filter((o) => o._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: tf("error", "Erreur"),
        text2: err?.response?.data?.message ?? tf("somethingWrong", "Une erreur s'est produite"),
      });
    } finally {
      setDeleting(false);
    }
  };

  const renderItem = ({ item }: { item: Offer }) => {
    const valid = isCurrentlyValid(item);
    const statusColor = valid ? COLORS.primary : !item.isActive ? "#EF4444" : "#EAB308";
    const statusLabel = valid
      ? tf("visibleToUsers", "Visible (période en cours)")
      : !item.isActive
      ? tf("inactive", "Inactive")
      : tf("outOfDateRange", "Hors période");
    const productName = getProductName(item);
    const images = getDisplayImages(item); // 👈 AJOUT
    const cover = images[0];

    return (
      <View
        className="bg-white rounded-xl border border-gray-100 mb-4 overflow-hidden"
        style={{
          width: "48%",
          shadowColor: "#000",
          shadowOpacity: 0.03,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        }}
      >
        {/* ------- Image ------- */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => cover && setCarousel({ images, index: 0 })}
          disabled={!cover}
        >
          <View style={{ width: "100%", height: 110 }}>
            {cover ? (
              <Image source={{ uri: cover }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            ) : (
              <View
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#1F2937",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="pricetag-outline" size={22} color="rgba(255,255,255,0.5)" />
              </View>
            )}

            {/* 👇 AJOUT — badge "plusieurs photos" */}
            {images.length > 1 && (
              <View
                style={{
                  position: "absolute",
                  bottom: 8,
                  left: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                  borderRadius: 999,
                }}
              >
                <Ionicons name="images-outline" size={10} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700", marginLeft: 3 }}>
                  {images.length}
                </Text>
              </View>
            )}

            {/* Badge % en overlay */}
            <View
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                paddingVertical: 3,
                paddingHorizontal: 8,
                borderRadius: 999,
                backgroundColor: COLORS.primary,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff" }}>
                -{item.discountPercentage}%
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ------- Contenu ------- */}
        <View className="p-3">
          <Text
            className="text-primary font-extrabold text-[13px]"
            numberOfLines={1}
          >
            {item.title}
          </Text>

          <Text className="text-secondary text-[11px] mt-0.5" numberOfLines={2}>
            {item.description}
          </Text>

          {/* Produit lié à l'offre */}
          <View
            className="flex-row items-center self-start mt-2 px-2 py-1 rounded-lg"
            style={{ backgroundColor: productName ? "#EEF2FF" : "#FEF2F2" }}
          >
            <Ionicons
              name={productName ? "cube-outline" : "alert-circle-outline"}
              size={11}
              color={productName ? "#4F46E5" : "#EF4444"}
            />
            <Text
              className="ml-1 font-semibold text-[10px]"
              style={{ color: productName ? "#4F46E5" : "#EF4444" }}
              numberOfLines={1}
            >
              {productName ?? tf("noProductLinked", "Aucun produit lié")}
            </Text>
          </View>

          {/* ------- Prix initial barré + prix final ------- */}
          <View className="flex-row items-center mt-2" style={{ gap: 6 }}>
            <Text style={{ fontSize: 11, color: "#9CA3AF", textDecorationLine: "line-through" }}>
              {formatPrice(item.originalPrice)}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "800", color: COLORS.primary }}>
              {formatPrice(item.finalPrice)}
            </Text>
          </View>

          {/* Statut */}
          <View className="flex-row items-center mt-2" style={{ gap: 5 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: statusColor,
              }}
            />
            <Text className="text-secondary text-[10px] font-semibold" numberOfLines={1}>
              {statusLabel}
            </Text>
          </View>

          {/* Période de l'offre */}
          <View className="flex-row items-center mt-1" style={{ gap: 4 }}>
            <Ionicons name="calendar-outline" size={11} color={COLORS.secondary} />
            <Text className="text-secondary text-[10px]" numberOfLines={1}>
              {new Date(item.startDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
              {" → "}
              {new Date(item.endDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
            </Text>
          </View>

          {/* Code promo */}
          <View
            className="flex-row items-center self-start mt-2 px-2 py-1 rounded-lg"
            style={{ backgroundColor: "#F5F5F8" }}
          >
            <Ionicons name="pricetag" size={11} color={COLORS.primary} />
            <Text
              className="ml-1 font-bold text-[11px]"
              style={{ color: COLORS.primary, letterSpacing: 0.5 }}
              numberOfLines={1}
            >
              {item.code}
            </Text>
          </View>

          {/* Actions */}
          <View className="flex-row mt-3" style={{ gap: 6 }}>
            <TouchableOpacity
              onPress={() => router.push(`/admin/offers/${item._id}` as any)}
              activeOpacity={0.8}
              className="flex-1 h-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#1F2937" }}
            >
              <Ionicons name="pencil-outline" size={14} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDeleteTarget(item)}
              activeOpacity={0.8}
              className="flex-1 h-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#EF4444" }}
            >
              <Ionicons name="trash-outline" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={tf("manageOffers", "Gérer les offres")} showBack />

      <View className="px-4 my-2">
        <TouchableOpacity
          onPress={() => router.push("/admin/offers/create" as any)}
          className="flex-row items-center justify-center rounded-xl"
          style={{
            backgroundColor: COLORS.primary,
            paddingVertical: 13,
            shadowColor: "#000",
            shadowOpacity: 0.03,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          }}
        >
          <Ionicons name="add-outline" size={20} color="#fff" />
          <Text className="font-bold text-white text-[15px] ml-1">
            {tf("newOffer", "Nouvelle offre")}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : offers.length === 0 ? (
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-secondary">{tf("noOffersAvailable", "Aucune offre pour le moment")}</Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ImageCarouselModal
        visible={!!carousel}
        images={carousel?.images ?? []}
        initialIndex={carousel?.index ?? 0}
        onClose={() => setCarousel(null)}
      />

      <ConfirmDeleteModal
        visible={!!deleteTarget}
        title={tf("confirmDelete", "Confirmer la suppression")}
        message={tf("confirmDeleteOfferMsg", "Cette action est irréversible.")}
        itemName={deleteTarget?.title}
        cancelText={tf("cancel", "Annuler")}
        confirmText={tf("delete", "Supprimer")}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </SafeAreaView>
  );
}