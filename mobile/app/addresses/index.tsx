import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import { COLORS } from "@/constants";
import type { Address } from "@/constants/types";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";
import Toast from "react-native-toast-message";
import { useLanguage } from "@/context/LanguageContext";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

export default function Addresses() {
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [type, setType] = useState("Home");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ← état pour la popup de suppression
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const token = await getToken();
      const { data } = await api.get("/addresses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAddresses(data.data);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("failedToFetchAddresses"),
        text2: error.response?.data?.message || t("somethingWrong"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSearch = (item: Address) => {
    setIsEditing(true);
    setEditingId(item._id);
    setType(item.type);
    setStreet(item.street);
    setCity(item.city);
    setState(item.state);
    setZipCode(item.zipCode);
    setCountry(item.country);
    setIsDefault(item.isDefault);
    setModalVisible(true);
  };

  const handleSaveAddress = async () => {
    if (!street || !city || !state || !zipCode || !country) {
      Toast.show({
        type: "error",
        text1: t("missingFields"),
        text2: t("fillAllFields"),
      });
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      const data = { type, street, city, state, zipCode, country, isDefault };
      if (isEditing && editingId) {
        await api.put(`/addresses/${editingId}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post("/addresses", data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setModalVisible(false);
      resetForm();
      fetchAddresses();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("failedToSaveAddress"),
        text2: error.response?.data?.message || t("somethingWrong"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ← ouvre juste la popup, avec un libellé lisible pour l'adresse concernée
  const handleDeleteAddress = (item: Address) => {
    setDeleteTarget({
      id: item._id,
      label: `${item.type} - ${item.street}`,
    });
  };

  // ← logique de suppression réelle, appelée depuis la popup
  const performDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = await getToken();
      await api.delete(`/addresses/${deleteTarget.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAddresses();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("failedToDeleteAddress"),
        text2: error.response?.data?.message || t("somethingWrong"),
      });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const resetForm = () => {
    setStreet("");
    setCity("");
    setState("");
    setZipCode("");
    setCountry("");
    setType("Home");
    setIsDefault(false);
    setIsEditing(false);
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Header title={t("shippingAddresses")} showBack />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-4">
          {addresses.length === 0 ? (
            <Text className="text-center text-secondary mt-10">
              {t("noAddressesFound")}
            </Text>
          ) : (
            addresses.map((item) => (
              <View
                key={item._id}
                className="bg-white p-4 rounded-xl mb-4 shadow-sm"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Ionicons
                      name={
                        item.type === "Home"
                          ? "home-outline"
                          : "briefcase-outline"
                      }
                      size={20}
                      color={COLORS.primary}
                    />
                    <Text className="text-base font-bold text-primary ml-2">
                      {item.type}
                    </Text>
                    {item.isDefault && (
                      <View className="bg-primary/10 px-2 py-1 rounded ml-2">
                        <Text className="text-primary text-xs font-bold">
                          {t("default")}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row items-center gap-4">
                    <TouchableOpacity onPress={() => handleEditSearch(item)}>
                      <Ionicons
                        name="pencil-outline"
                        size={20}
                        color={COLORS.secondary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteAddress(item)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={COLORS.error || "#ff4444"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text className="text-secondary leading-5 ml-7">
                  {item.street}, {item.city}, {item.state} {item.zipCode},{" "}
                  {item.country}
                </Text>
              </View>
            ))
          )}

          <TouchableOpacity
            className="flex-row items-center justify-center p-4 border border-dashed border-gray-300 rounded-xl mt-2 mb-8"
            onPress={openAddModal}
          >
            <Ionicons name="add" size={24} color={COLORS.secondary} />
            <Text className="text-secondary font-medium ml-2">
              {t("addNewAddress")}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Add Address Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 h-[85%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-primary">
                {isEditing ? t("editAddress") : t("addNewAddress")}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-primary font-medium mb-2">
                {t("label")}
              </Text>
              <View className="flex-row gap-3 mb-4">
                {["Home", "Work", "Other"].map((typeOption) => (
                  <TouchableOpacity
                    key={typeOption}
                    onPress={() => setType(typeOption)}
                    className={`px-4 py-2 rounded-full border ${type === typeOption ? "bg-primary border-primary" : "bg-white border-gray-300"}`}
                  >
                    <Text
                      className={
                        type === typeOption ? "text-white" : "text-primary"
                      }
                    >
                      {t(typeOption.toLowerCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-primary font-medium mb-2">
                {t("streetAddress")}
              </Text>
              <TextInput
                className="bg-surface p-4 rounded-xl text-primary mb-4"
                placeholder="123 Main St"
                value={street}
                onChangeText={setStreet}
              />

              <View className="flex-row gap-4 mb-4">
                <View className="flex-1">
                  <Text className="text-primary font-medium mb-2">
                    {t("city")}
                  </Text>
                  <TextInput
                    className="bg-surface p-4 rounded-xl text-primary"
                    placeholder="New York"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-primary font-medium mb-2">
                    {t("state")}
                  </Text>
                  <TextInput
                    className="bg-surface p-4 rounded-xl text-primary"
                    placeholder="NY"
                    value={state}
                    onChangeText={setState}
                  />
                </View>
              </View>

              <View className="flex-row gap-4 mb-4">
                <View className="flex-1">
                  <Text className="text-primary font-medium mb-2">
                    {t("zipCode")}
                  </Text>
                  <TextInput
                    className="bg-surface p-4 rounded-xl text-primary"
                    placeholder="10001"
                    value={zipCode}
                    onChangeText={setZipCode}
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-primary font-medium mb-2">
                    {t("country")}
                  </Text>
                  <TextInput
                    className="bg-surface p-4 rounded-xl text-primary"
                    placeholder="USA"
                    value={country}
                    onChangeText={setCountry}
                  />
                </View>
              </View>

              <TouchableOpacity
                className="flex-row items-center mb-8"
                onPress={() => setIsDefault(!isDefault)}
              >
                <View
                  className={`w-5 h-5 border rounded mr-2 items-center justify-center ${isDefault ? "bg-primary border-primary" : "border-gray-300"}`}
                >
                  {isDefault && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </View>
                <Text className="text-primary">{t("setAsDefault")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-full bg-primary py-4 rounded-full items-center mb-10"
                onPress={handleSaveAddress}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    {t("saveAddress")}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ← Popup de confirmation custom */}
      <ConfirmDeleteModal
        visible={!!deleteTarget}
        title={t("deleteAddress")}
        message={t("deleteAddressConfirm")}
        itemName={deleteTarget?.label}
        cancelText={t("cancel")}
        confirmText={t("delete")}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={performDelete}
        loading={deleting}
      />
    </SafeAreaView>
  );
}