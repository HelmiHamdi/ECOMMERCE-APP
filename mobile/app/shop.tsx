import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Product } from "@/constants/types";

import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";
import { TextInput } from "react-native-gesture-handler";
import ProductCard from "@/components/ProductCard";
import api from "@/constants/api";
import { useLanguage } from "@/context/LanguageContext";
import MultiSlider from "@ptomasroos/react-native-multi-slider";

const CATEGORY_OPTIONS: { key: string; labelKey: string }[] = [
  { key: "men", labelKey: "men" },
  { key: "women", labelKey: "women" },
  { key: "kids", labelKey: "kids" },
  { key: "shoes", labelKey: "shoes" },
  { key: "bag", labelKey: "bag" },
  { key: "other", labelKey: "other" },
];

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];


const CURRENCIES = {
  USD: { symbol: "$", min: 0, max: 500, step: 5 },
  EUR: { symbol: "€", min: 0, max: 500, step: 5 },
  TND: { symbol: "DT", min: 0, max: 1500, step: 10 },
} as const;

type CurrencyKey = keyof typeof CURRENCIES;

export default function Shop() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHashMore] = useState(true);

 
  const [searchText, setSearchText] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyKey>("USD");
  const [minPrice, setMinPrice] = useState<number>(CURRENCIES.USD.min);
  const [maxPrice, setMaxPrice] = useState<number>(CURRENCIES.USD.max);
  const [priceFilterActive, setPriceFilterActive] = useState(false);


  const [draftCategory, setDraftCategory] = useState<string | null>(null);
  const [draftSize, setDraftSize] = useState<string | null>(null);
  const [draftCurrency, setDraftCurrency] = useState<CurrencyKey>("USD");
  const [draftMinPrice, setDraftMinPrice] = useState<number>(CURRENCIES.USD.min);
  const [draftMaxPrice, setDraftMaxPrice] = useState<number>(CURRENCIES.USD.max);

  const activeFilterCount =
    (category ? 1 : 0) + (size ? 1 : 0) + (priceFilterActive ? 1 : 0);

  const fetchProducts = async (pageNumber = 1) => {
    if (pageNumber === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const queryParams: any = { page: pageNumber, limit: 10 };

      if (searchText.trim()) queryParams.search = searchText.trim();
      if (category) queryParams.category = category;
      if (size) queryParams.size = size;
      if (priceFilterActive) {
        queryParams.currency = currency;
        queryParams.minPrice = minPrice;
        queryParams.maxPrice = maxPrice;
      }

      const { data } = await api.get("/products", {
        params: queryParams,
      });
      if (pageNumber === 1) {
        setProducts(data.data);
      } else {
        setProducts((prev) => [...prev, ...data.data]);
      }
      setHashMore(data.pagination.page < data.pagination.pages);
      setPage(pageNumber);
    } catch (error) {
      console.error("Pagination error:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && !loading && hasMore) {
      fetchProducts(page + 1);
    }
  };

  useEffect(() => {
    fetchProducts(1);
  }, []);


  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchProducts(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchText]);

  
  useEffect(() => {
    fetchProducts(1);
  }, [category, size, currency, minPrice, maxPrice, priceFilterActive]);

  const openFilters = () => {
    setDraftCategory(category);
    setDraftSize(size);
    setDraftCurrency(currency);
    setDraftMinPrice(minPrice);
    setDraftMaxPrice(maxPrice);
    setShowFilters(true);
  };

  const applyFilters = () => {
    setCategory(draftCategory);
    setSize(draftSize);
    setCurrency(draftCurrency);
    setMinPrice(draftMinPrice);
    setMaxPrice(draftMaxPrice);
    const bounds = CURRENCIES[draftCurrency];
    setPriceFilterActive(
      draftMinPrice > bounds.min || draftMaxPrice < bounds.max
    );
    setShowFilters(false);
  };

  const resetFilters = () => {
    setDraftCategory(null);
    setDraftSize(null);
    setDraftCurrency("USD");
    setDraftMinPrice(CURRENCIES.USD.min);
    setDraftMaxPrice(CURRENCIES.USD.max);
  };

  const changeDraftCurrency = (curr: CurrencyKey) => {
    setDraftCurrency(curr);
    setDraftMinPrice(CURRENCIES[curr].min);
    setDraftMaxPrice(CURRENCIES[curr].max);
  };

  const bounds = CURRENCIES[draftCurrency];

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={t("shop")} showBack showCart />

   
      <View className="flex-row gap-2 mb-3 mx-4 my-2">
        <View
          className="flex-1 flex-row items-center bg-white rounded-xl border border-gray-100"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.03,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          }}
        >
          <Ionicons
            name="search"
            className="ml-4"
            size={20}
            color={COLORS.secondary}
          />
          <TextInput
            className="flex-1 ml-2 text-primary px-4 py-3"
            placeholder={t("searchProductsPlaceholder")}
            returnKeyType="search"
            placeholderTextColor={COLORS.secondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")} className="pr-4">
              <Ionicons name="close-circle" size={18} color={COLORS.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* filter icon */}
        <TouchableOpacity
          onPress={openFilters}
          className="w-12 h-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: activeFilterCount > 0 ? COLORS.primary : "#1F2937" }}
        >
          <Ionicons name="options-outline" size={24} color="white" />
          {activeFilterCount > 0 && (
            <View
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: "#EF4444",
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 3,
                borderWidth: 2,
                borderColor: "#fff",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>
                {activeFilterCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

     
      {activeFilterCount > 0 && (
        <View className="flex-row flex-wrap px-4 mb-2" style={{ gap: 8 }}>
          {category && (
            <FilterChip
              label={t(category as any) || category}
              onRemove={() => setCategory(null)}
            />
          )}
          {size && <FilterChip label={size} onRemove={() => setSize(null)} />}
          {priceFilterActive && (
            <FilterChip
              label={`${minPrice} - ${maxPrice} ${CURRENCIES[currency].symbol}`}
              onRemove={() => {
                setPriceFilterActive(false);
                setMinPrice(CURRENCIES[currency].min);
                setMaxPrice(CURRENCIES[currency].max);
              }}
            />
          )}
        </View>
      )}

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary}></ActivityIndicator>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          renderItem={({ item }) => <ProductCard product={item} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4">
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading && (
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-secondary">{t("noProductsFound")}</Text>
              </View>
            )
          }
        />
      )}

     
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)} >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: "85%",
              paddingBottom: 45,
            }}
          >
           
            <View className="items-center pt-3 pb-1">
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E5EA" }} />
            </View>
            <View className="flex-row items-center justify-between px-6 pt-3 pb-4">
              <Text className="text-primary font-extrabold text-xl">{t("options") || "Filtres"}</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }} showsVerticalScrollIndicator={false} >
             
              <Text className="text-primary font-bold text-base mb-3">{t("category")}</Text>
              <View className="flex-row flex-wrap mb-6" style={{ gap: 8 }}>
                {CATEGORY_OPTIONS.map((c) => {
                  const active = draftCategory === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      onPress={() => setDraftCategory(active ? null : c.key)}
                      style={{
                        paddingVertical: 9,
                        paddingHorizontal: 16,
                        borderRadius: 999,
                        backgroundColor: active ? COLORS.primary : "#F5F5F8",
                        borderWidth: 1.5,
                        borderColor: active ? COLORS.primary : "transparent",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "#fff" : "#4A4A4F" }}>
                        {t(c.labelKey as any) || c.key}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              
              <Text className="text-primary font-bold text-base mb-3">{t("size")}</Text>
              <View className="flex-row flex-wrap mb-6" style={{ gap: 8 }}>
                {SIZE_OPTIONS.map((s) => {
                  const active = draftSize === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setDraftSize(active ? null : s)}
                      style={{
                        width: 48,
                        height: 44,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 12,
                        backgroundColor: active ? COLORS.primary : "#F5F5F8",
                        borderWidth: 1.5,
                        borderColor: active ? COLORS.primary : "transparent",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "#fff" : "#4A4A4F" }}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              
              <Text className="text-primary font-bold text-base mb-3">
                {t("currency") || "Devise"}
              </Text>
              <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
                {(Object.keys(CURRENCIES) as CurrencyKey[]).map((curr) => {
                  const active = draftCurrency === curr;
                  return (
                    <TouchableOpacity
                      key={curr}
                      onPress={() => changeDraftCurrency(curr)}
                      style={{
                        paddingVertical: 9,
                        paddingHorizontal: 16,
                        borderRadius: 999,
                        backgroundColor: active ? COLORS.primary : "#F5F5F8",
                        borderWidth: 1.5,
                        borderColor: active ? COLORS.primary : "transparent",
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "#fff" : "#4A4A4F" }}>
                        {curr} ({CURRENCIES[curr].symbol})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

             
              <Text className="text-primary font-bold text-base mb-3">{t("price")}</Text>
              <View className="flex-row justify-between mb-2">
                <Text style={{ color: "#4A4A4F", fontWeight: "700" }}>
                  {draftMinPrice} {bounds.symbol}
                </Text>
                <Text style={{ color: "#4A4A4F", fontWeight: "700" }}>
                  {draftMaxPrice} {bounds.symbol}
                </Text>
              </View>
              <View style={{ alignItems: "center", marginBottom: 24 }}>
                <MultiSlider
                  values={[draftMinPrice, draftMaxPrice]}
                  min={bounds.min}
                  max={bounds.max}
                  step={bounds.step}
                  sliderLength={280}
                  onValuesChange={(values) => {
                    setDraftMinPrice(values[0]);
                    setDraftMaxPrice(values[1]);
                  }}
                  selectedStyle={{ backgroundColor: COLORS.primary }}
                  unselectedStyle={{ backgroundColor: "#E5E5EA" }}
                  markerStyle={{
                    backgroundColor: "#fff",
                    borderWidth: 2,
                    borderColor: COLORS.primary,
                    height: 22,
                    width: 22,
                    shadowColor: "#000",
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                  containerStyle={{ height: 40 }}
                />
              </View>
            </ScrollView>

         
            <View className="flex-row px-6 pt-2" style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={resetFilters}
                className="flex-1 py-4 rounded-full items-center"
                style={{ backgroundColor: "#F5F5F8" }}
              >
                <Text className="font-bold text-[15px]" style={{ color: "#4A4A4F" }}>
                  {t("cancel") || "Réinitialiser"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={applyFilters}
                className="flex-1 py-4 rounded-full items-center"
                style={{
                  backgroundColor: COLORS.primary,
                  shadowColor: COLORS.primary,
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 4,
                }}
              >
                <Text className="text-white font-bold text-[15px]">{t("save") || "Appliquer"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const FilterChip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <View
    className="flex-row items-center bg-white border border-gray-100 rounded-full px-3 py-1.5"
    style={{ gap: 6 }}
  >
    <Text className="text-primary text-xs font-semibold">{label}</Text>
    <TouchableOpacity onPress={onRemove} hitSlop={6}>
      <Ionicons name="close" size={14} color={COLORS.secondary} />
    </TouchableOpacity>
  </View>
);