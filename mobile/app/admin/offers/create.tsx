import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView,useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import Header from "@/components/Header";
import OfferImagesPicker from "@/components/OfferImagesPicker";
import CalendarPickerModal from "@/components/CalendarPickerModal";
import { COLORS } from "@/constants";
import { useAuth } from "@clerk/clerk-expo";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import api from "@/constants/api";

const SURFACE = "#F5F5F8";
const INK = "#13131A";
const MUTED = "#8D8D96";

const formatDisplay = (dateString: string) => {
  const [y, m, d] = dateString.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

type ProductOption = {
  _id: string;
  name: string;
  price: number;
  images?: string[];
  status?: string; 
};


const STATUS_OPTIONS = [
  { value: "in_stock", label: "En stock", color: "#16A34A" },
  { value: "incoming", label: "Bientôt dispo", color: "#2563EB" },
  { value: "out_of_stock", label: "Rupture", color: "#EF4444" },
  { value: "on_order_48h", label: "Sur commande 48h", color: "#EAB308" },
] as const;

export default function CreateOfferScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();

 
  const { productId } = useLocalSearchParams<{ productId?: string }>();

  const tf = (key: string, fallback: string) => {
    const val = t(key as any);
    if (!val || typeof val !== "string" || val.toLowerCase().includes("missing")) {
      return fallback;
    }
    return val;
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");

  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);


  const [newImages, setNewImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);


  const [status, setStatus] = useState<string>("in_stock");

  const finalPricePreview = useMemo(() => {
    const price = parseFloat(originalPrice);
    const discount = parseFloat(discountPercentage);
    if (Number.isNaN(price) || Number.isNaN(discount)) return null;
    const final = price - (price * discount) / 100;
    return Math.round(final * 100) / 100;
  }, [originalPrice, discountPercentage]);

  const handleSelectProduct = (product: ProductOption) => {
    setSelectedProduct(product);
    setOriginalPrice((prev) => (prev ? prev : String(product.price)));
    setShowProductPicker(false);
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
  };

  useEffect(() => {
    if (!productId) return;
    (async () => {
      try {
        const res = await api.get(`/products/${productId}`);
        const p = res.data.data;
        handleSelectProduct({
          _id: p._id,
          name: p.name,
          price: p.price,
          images: p.images,
          status: p.status, 
        });
      } catch (err) {
        console.error("Failed to prefill product:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleSubmit = async () => {
  
    if (!selectedProduct && newImages.length === 0) {
      Toast.show({
        type: "error",
        text1: tf("missingFields", "Champs manquants"),
        text2: tf("productOrImageRequired", "Sélectionnez un produit ou ajoutez au moins une image"),
      });
      return;
    }

    if (
      !title.trim() ||
      !description.trim() ||
      !code.trim() ||
      !originalPrice ||
      !discountPercentage ||
      !startDate ||
      !endDate
    ) {
      Toast.show({
        type: "error",
        text1: tf("missingFields", "Champs manquants"),
        text2: tf("allFieldsRequired", "Tous les champs sont requis"),
      });
      return;
    }

    if (endDate < startDate) {
      Toast.show({
        type: "error",
        text1: tf("invalidDates", "Dates invalides"),
        text2: tf("endDateBeforeStart", "La date de fin doit être après la date de début"),
      });
      return;
    }

    const priceNum = parseFloat(originalPrice);
    const discountNum = parseFloat(discountPercentage);

    if (Number.isNaN(priceNum) || priceNum <= 0) {
      Toast.show({
        type: "error",
        text1: tf("invalidPrice", "Prix invalide"),
        text2: tf("enterValidPrice", "Entrez un prix initial valide"),
      });
      return;
    }

    if (Number.isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      Toast.show({
        type: "error",
        text1: tf("invalidDiscount", "Réduction invalide"),
        text2: tf("discountBetween0And100", "La réduction doit être entre 0 et 100"),
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("code", code.trim().toUpperCase());
      if (selectedProduct) {
        formData.append("product", selectedProduct._id);
      }
      formData.append("originalPrice", String(priceNum));
      formData.append("discountPercentage", String(discountNum));
      formData.append("startDate", startDate);
      formData.append("endDate", endDate);

    
      formData.append("status", selectedProduct ? selectedProduct.status ?? "in_stock" : status);

     
      if (!selectedProduct) {
        newImages.forEach((uri, i) => {
          const filename = uri.split("/").pop() ?? `offer-${i}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const fileType = match ? `image/${match[1]}` : "image/jpeg";
          formData.append("images", { uri, name: filename, type: fileType } as any);
        });
      }

      await api.post("/offers", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      Toast.show({ type: "success", text1: tf("offerCreated", "Offre créée avec succès") });
      router.back();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: tf("error", "Erreur"),
        text2: err?.response?.data?.message ?? tf("somethingWrong", "Une erreur s'est produite"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Header title={tf("newOffer", "Nouvelle offre")} showBack />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
         
          <View className="mb-3">
            <Text className="text-[13px] font-semibold mb-2" style={{ color: "#4A4A4F" }}>
              {tf("linkedProduct", "Produit lié (optionnel)")}
            </Text>
            <TouchableOpacity
              onPress={() => setShowProductPicker(true)}
              activeOpacity={0.7}
              className="rounded-2xl px-4 py-3 flex-row items-center justify-between"
              style={{ backgroundColor: SURFACE }}
            >
              {selectedProduct ? (
                <View className="flex-row items-center flex-1 mr-2">
                  {selectedProduct.images?.[0] && (
                    <Image
                      source={{ uri: selectedProduct.images[0] }}
                      style={{ width: 32, height: 32, borderRadius: 8, marginRight: 8 }}
                    />
                  )}
                  <Text style={{ color: INK, fontSize: 15, flex: 1 }} numberOfLines={1}>
                    {selectedProduct.name}
                  </Text>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleClearProduct();
                    }}
                    hitSlop={8}
                    style={{ marginRight: 6 }}
                  >
                    <Ionicons name="close-circle" size={20} color={MUTED} />
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={{ color: "#ABABB2", fontSize: 15 }}>
                  {tf("selectProduct", "Sélectionner un produit")}
                </Text>
              )}
              <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

       
          {selectedProduct ? (
            <View className="mb-4">
              <Text className="text-[13px] font-semibold mb-2" style={{ color: "#4A4A4F" }}>
                {tf("productImagesUsed", "Les images du produit lié seront utilisées")}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(selectedProduct.images ?? []).map((url) => (
                    <Image
                      key={url}
                      source={{ uri: url }}
                      style={{ width: 70, height: 70, borderRadius: 10 }}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View className="mb-4">
              <Text className="text-[13px] font-semibold mb-2" style={{ color: "#4A4A4F" }}>
                {tf("offerImages", "Images de l'offre")}
              </Text>
              <OfferImagesPicker
                existingImages={[]}
                newImages={newImages}
                onAdd={(uri) => setNewImages((prev) => [...prev, uri])}
                onRemoveNew={(uri) => setNewImages((prev) => prev.filter((u) => u !== uri))}
                onRemoveExisting={() => {}}
                max={10}
                addLabel={tf("upTo10Images", "Jusqu'à 10 images")}
                limitLabel={tf("imageLimitReached", "Limite de 10 images atteinte")}
                permissionDeniedTitle={tf("permissionDenied", "Permission refusée")}
                permissionDeniedMessage={tf("photoAccessRequired", "Accès aux photos requis")}
              />
            </View>
          )}

          {!selectedProduct && (
            <View className="mb-4">
              <Text className="text-[13px] font-semibold mb-2" style={{ color: "#4A4A4F" }}>
                {tf("stockStatus", "État du stock")}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {STATUS_OPTIONS.map((opt) => {
                  const active = status === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setStatus(opt.value)}
                      activeOpacity={0.8}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        backgroundColor: active ? opt.color : SURFACE,
                      }}
                    >
                      <Text style={{ color: active ? "#fff" : INK, fontSize: 12, fontWeight: "600" }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {selectedProduct && (
            <View
              className="flex-row items-center mb-4 px-3 py-2 rounded-xl"
              style={{ backgroundColor: SURFACE }}
            >
              <Ionicons name="information-circle-outline" size={16} color={MUTED} />
              <Text style={{ color: MUTED, fontSize: 12, marginLeft: 6, flex: 1 }}>
                {tf(
                  "statusFromProduct",
                  "Le statut de stock du produit lié sera utilisé automatiquement"
                )}
              </Text>
            </View>
          )}

          <Field label={tf("title", "Titre")} value={title} onChangeText={setTitle} />
          <Field
            label={tf("description", "Description")}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Field label={tf("promoCode", "Code promo")} value={code} onChangeText={setCode} autoCapitalize="characters" />

          <Field
            label={tf("originalPrice", "Prix initial (DT)")}
            value={originalPrice}
            onChangeText={setOriginalPrice}
            keyboardType="numeric"
            placeholder={tf("pricePlaceholder", "ex: 120.00")}
          />

          <Field
            label={tf("discountPercentage", "Réduction (%)")}
            value={discountPercentage}
            onChangeText={setDiscountPercentage}
            keyboardType="numeric"
          />

          {finalPricePreview !== null && !Number.isNaN(parseFloat(originalPrice)) && (
            <View
              className="flex-row items-center justify-between rounded-2xl px-4 py-3 mb-3"
              style={{ backgroundColor: `${COLORS.primary}12` }}
            >
              <Text className="text-[13px] font-semibold" style={{ color: "#4A4A4F" }}>
                {tf("priceAfterDiscount", "Prix après réduction")}
              </Text>
              <View className="flex-row items-center">
                <Text style={{ color: MUTED, textDecorationLine: "line-through", fontSize: 13, marginRight: 6 }}>
                  {formatPrice(parseFloat(originalPrice))}
                </Text>
                <Text style={{ color: COLORS.primary, fontWeight: "800", fontSize: 15 }}>
                  {formatPrice(finalPricePreview)}
                </Text>
              </View>
            </View>
          )}

          <DateField
            label={tf("startDate", "Date de début")}
            value={startDate}
            placeholder={tf("selectDate", "Sélectionner une date")}
            onPress={() => setShowStartPicker(true)}
          />

          <DateField
            label={tf("endDate", "Date de fin")}
            value={endDate}
            placeholder={tf("selectDate", "Sélectionner une date")}
            onPress={() => setShowEndPicker(true)}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            className="rounded-full py-4 items-center mt-2"
            style={{ backgroundColor: submitting ? "#EDEDF0" : COLORS.primary }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-bold text-white text-[15px]">{tf("create", "Créer")}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <CalendarPickerModal
        visible={showStartPicker}
        selectedDate={startDate}
        minDate={undefined}
        title={tf("startDate", "Date de début")}
        closeLabel={tf("close", "Fermer")}
        todayLabel={tf("today", "Aujourd'hui")}
        onSelect={(date) => setStartDate(date)}
        onClose={() => setShowStartPicker(false)}
      />

      <CalendarPickerModal
        visible={showEndPicker}
        selectedDate={endDate}
        minDate={startDate ?? undefined}
        title={tf("endDate", "Date de fin")}
        closeLabel={tf("close", "Fermer")}
        todayLabel={tf("today", "Aujourd'hui")}
        onSelect={(date) => setEndDate(date)}
        onClose={() => setShowEndPicker(false)}
      />

      <ProductPickerModal
        visible={showProductPicker}
        title={tf("selectProduct", "Sélectionner un produit")}
        closeLabel={tf("close", "Fermer")}
        searchPlaceholder={tf("searchProduct", "Rechercher un produit...")}
        emptyLabel={tf("noProductsFound", "Aucun produit trouvé")}
        onSelect={handleSelectProduct}
        onClose={() => setShowProductPicker(false)}
      />
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
  autoCapitalize,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
  autoCapitalize?: "none" | "characters";
  placeholder?: string;
}) {
  return (
    <View className="mb-3">
      <Text className="text-[13px] font-semibold mb-2" style={{ color: "#4A4A4F" }}>
        {label}
      </Text>
      <TextInput
        className="rounded-2xl px-4 py-3"
        style={{
          backgroundColor: SURFACE,
          color: INK,
          minHeight: multiline ? 90 : undefined,
          textAlignVertical: multiline ? "top" : "center",
        }}
        placeholder={placeholder}
        placeholderTextColor="#ABABB2"
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function DateField({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <View className="mb-3">
      <Text className="text-[13px] font-semibold mb-2" style={{ color: "#4A4A4F" }}>
        {label}
      </Text>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className="rounded-2xl px-4 py-3 flex-row items-center justify-between"
        style={{ backgroundColor: SURFACE }}
      >
        <Text style={{ color: value ? INK : "#ABABB2", fontSize: 15 }}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

function ProductPickerModal({
  visible,
  title,
  closeLabel,
  searchPlaceholder,
  emptyLabel,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  closeLabel: string;
  searchPlaceholder: string;
  emptyLabel: string;
  onSelect: (product: ProductOption) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets(); 

  const loadProducts = React.useCallback(async (search: string) => {
    setLoading(true);
    try {
      const res = await api.get("/products/for-offer", {
        params: { limit: 1000, ...(search ? { search } : {}) },
      });
      const list = res.data?.data ?? res.data?.products ?? [];
      setProducts(list);
    } catch (err) {
      console.error("Failed to load products:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (visible) {
      loadProducts(query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  React.useEffect(() => {
    if (!visible) return;
    const timeout = setTimeout(() => loadProducts(query), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        onPress={onClose}
        
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
            // 👇 CORRECTION — ajoute la hauteur de la barre de navigation système
            // (insets.bottom) pour que "Clôturer" ne soit plus collé/caché en bas
            paddingBottom: 12 + insets.bottom,
            paddingHorizontal: 12,
            height: "75%",
          }}
          
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#E5E5E7",
              alignSelf: "center",
              marginBottom: 12,
            }}
          />
          <Text className="font-bold text-[16px] mb-3 px-2" style={{ color: INK }}>
            {title}
          </Text>

          <View className="px-2 mb-3">
            <View
              className="flex-row items-center rounded-2xl px-3"
              style={{ backgroundColor: SURFACE }}
            >
              <Ionicons name="search" size={18} color={MUTED} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor="#ABABB2"
                className="flex-1 py-3 px-2"
                style={{ color: INK }}
              />
            </View>
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : products.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Text style={{ color: MUTED }}>{emptyLabel}</Text>
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => onSelect(item)}
                  activeOpacity={0.7}
                  className="flex-row items-center py-2.5 px-2 rounded-xl mb-1"
                  style={{ backgroundColor: SURFACE }}
                >
                  {item.images?.[0] ? (
                    <Image
                      source={{ uri: item.images[0] }}
                      style={{ width: 44, height: 44, borderRadius: 10, marginRight: 10 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        marginRight: 10,
                        backgroundColor: "#E5E5E7",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="cube-outline" size={18} color={MUTED} />
                    </View>
                  )}
                  <View className="flex-1">
                    <Text style={{ color: INK, fontWeight: "600", fontSize: 14 }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>
                      {item.price} DT
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={MUTED} />
                </TouchableOpacity>
              )}
            />
          )}

          <TouchableOpacity
            onPress={onClose}
            className="mt-3 py-3.5 rounded-2xl items-center mx-2"
            style={{ backgroundColor: SURFACE }}
          >
            <Text className="font-semibold" style={{ color: INK }}>
              {closeLabel}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}