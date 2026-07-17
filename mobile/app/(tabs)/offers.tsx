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
import ImageCarouselModal from "@/components/ImageCarouselModal";
import { COLORS } from "@/constants";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useCart } from "@/context/CartContext";
import api from "@/constants/api";

type OfferProduct = {
  _id: string;
  name: string;
  images?: string[];
  price?: number;
};

type Offer = {
  _id: string;
  title: string;
  description: string;
  images?: string[]; // 👈 images propres (offre "libre")
  code: string;
  originalPrice: number;
  discountPercentage: number;
  finalPrice: number;
  startDate: string;
  endDate: string;
  product?: OfferProduct | string | null; // 👈 objet si populate, string si id brut, null/absent si offre libre
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

// 👇 CORRECTION — "product" est un OBJET quand il est populate côté backend
// (populate("product", "name images price")), pas une string. Avant, ce code
// utilisait directement item.product comme id de produit.
const getOfferProductId = (offer: Offer): string | null => {
  if (!offer.product) return null;
  return typeof offer.product === "object" ? offer.product._id : offer.product;
};

const daysLeft = (endDate: string) => {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export default function OffersScreen() {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { addToCart, addOfferToCart } = useCart();
  const router = useRouter();

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
  const [addingId, setAddingId] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    try {
      const res = await api.get("/offers");
      setOffers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOffers();
    }, [loadOffers])
  );

  const showCodeHint = (code: string) => {
    Toast.show({
      type: "info",
      text1: tf("longPressToSelect", "Appui long sur le code pour le sélectionner"),
      text2: code,
    });
  };

  const handleAddOfferToCart = async (item: Offer) => {
    const productId = getOfferProductId(item);

    // 👇 offre "libre" (sans produit) : on l'ajoute directement
    if (!productId) {
      try {
        setAddingId(item._id);
        await addOfferToCart(item._id);
        Toast.show({
          type: "success",
          text1: tf("addedToCart", "Ajouté au panier"),
          text2: item.title,
        });
      } catch (error: any) {
        console.error(error);
        Toast.show({
          type: "error",
          text1: tf("error", "Erreur"),
          text2:
            error?.response?.data?.message ||
            tf("failedToAddToCart", "Échec de l'ajout au panier"),
        });
      } finally {
        setAddingId(null);
      }
      return;
    }

    try {
      setAddingId(item._id);

      const { data } = await api.get(`/products/${productId}`);
      const product = data.data;

      if (!product) {
        throw new Error("Product not found");
      }

      if (product.sizes && product.sizes.length > 0) {
        // 👇 CORRECTION — on transmet l'offerId à la fiche produit pour que
        // l'ajout au panier après sélection de taille applique bien le prix
        // promo (sinon l'offre était perdue en route et le prix normal
        // était utilisé, d'où le bug "prix initial dans le panier")
        router.push(`/product/${productId}?offerId=${item._id}`);
        setAddingId(null);
        return;
      }

      await addToCart(product, "", item._id);

      Toast.show({
        type: "success",
        text1: tf("addedToCart", "Ajouté au panier"),
        text2: item.title,
      });
    } catch (error: any) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: tf("error", "Erreur"),
        text2:
          error?.response?.data?.message ||
          tf("failedToAddToCart", "Échec de l'ajout au panier"),
      });
    } finally {
      setAddingId(null);
    }
  };

  const renderItem = ({ item }: { item: Offer }) => {
    const left = daysLeft(item.endDate);
    const urgent = left <= 3;
    const isAdding = addingId === item._id;
    const images = getDisplayImages(item);
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
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => cover && setCarousel({ images, index: 0 })}
          disabled={!cover}
        >
          <View style={{ width: "100%", height: 140 }}>
            {cover ? (
              <Image
                source={{ uri: cover }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: COLORS.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text className="text-white font-extrabold text-2xl">
                  -{item.discountPercentage}%
                </Text>
              </View>
            )}

            <View
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                backgroundColor: COLORS.primary,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 11 }}>
                -{item.discountPercentage}%
              </Text>
            </View>

            {images.length > 1 && (
              <View
                style={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(0,0,0,0.45)",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Ionicons name="images-outline" size={12} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", marginLeft: 4 }}>
                  {images.length}
                </Text>
              </View>
            )}

            {urgent && (
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  backgroundColor: "#EF4444",
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 9 }}>
                  {left === 0
                    ? tf("lastDay", "Dernier jour")
                    : `${left}j ${tf("left", "restants")}`}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View className="p-3">
          <Text className="text-primary font-extrabold text-[13px]" numberOfLines={1}>
            {item.title}
          </Text>

          <Text className="text-secondary text-[11px] mt-0.5" numberOfLines={2}>
            {item.description}
          </Text>

          <View className="flex-row items-center mt-2 flex-wrap" style={{ gap: 6 }}>
            <Text style={{ fontSize: 11, color: "#9CA3AF", textDecorationLine: "line-through" }}>
              {formatPrice(item.originalPrice)}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: "800", color: COLORS.primary }}>
              {formatPrice(item.finalPrice)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => showCodeHint(item.code)}
            activeOpacity={0.8}
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
          </TouchableOpacity>

          <View className="flex-row items-center mt-1" style={{ gap: 4 }}>
            <Ionicons name="time-outline" size={11} color={COLORS.secondary} />
            <Text className="text-secondary text-[10px]" numberOfLines={1}>
              {tf("validUntil", "Jusqu'au")}{" "}
              {new Date(item.endDate).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
              })}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => handleAddOfferToCart(item)}
            activeOpacity={0.85}
            disabled={isAdding}
            className="flex-row items-center justify-center mt-3 py-2 rounded-full"
            style={{
              backgroundColor: COLORS.primary,
              opacity: isAdding ? 0.6 : 1,
            }}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="bag-outline" size={14} color="#fff" />
                <Text className="text-white font-bold text-[11px] ml-1">
                  {tf("addToCart", "Ajouter au panier")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={tf("offers", "Offres")} showBack />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          renderItem={renderItem}
          ListEmptyComponent={
            !loading ? (
              <View className="flex-1 items-center justify-center py-20">
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: `${COLORS.primary}12` }}
                >
                  <Ionicons name="pricetag-outline" size={32} color={COLORS.primary} />
                </View>
                <Text className="text-primary text-center font-semibold text-[15px] mb-1">
                  {tf("noOffersTitle", "Aucune offre pour l'instant")}
                </Text>
                <Text className="text-secondary text-center text-[13px]">
                  {tf("noOffersAvailable", "Reviens bientôt pour découvrir nos promotions")}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      <ImageCarouselModal
        visible={!!carousel}
        images={carousel?.images ?? []}
        initialIndex={carousel?.index ?? 0}
        onClose={() => setCarousel(null)}
      />
    </SafeAreaView>
  );
}