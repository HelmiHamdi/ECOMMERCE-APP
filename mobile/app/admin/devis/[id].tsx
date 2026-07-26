import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import Header from "@/components/Header";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import SuccessModal from "@/components/SuccessModal";
import api from "@/constants/api";
import { Devis, DevisStatus } from "@/constants/types";
import { useLanguage } from "@/context/LanguageContext";
import { COLORS } from "@/constants";
import {
  DEVIS_COLORS,
  DEVIS_STATUS_KEYS,
  DEVIS_STATUS_META,
  DEVIS_STATUS_ORDER,
  formatDevisDate,
  initials,
} from "@/constants/devisTheme";
import AdminBottomMenu from "@/components/AdminBottomMenu";

export default function AdminDevisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const { getToken } = useAuth();
  const [devis, setDevis] = useState<Devis | null>(null);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  // ------- Suppression (ConfirmDeleteModal) -------
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ------- Confirmation de succès (SuccessModal) -------
  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: "", message: "" });

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await api.get(`/devis/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data: Devis = res.data.data;
        setDevis(data);
        setResponse(data.adminResponse || "");
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleStatusChange = async (status: DevisStatus) => {
    try {
      const token = await getToken();
      const res = await api.put(
        `/devis/${id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setDevis(res.data.data);
    } catch (error) {
      Alert.alert(
        t("error") ?? "Erreur",
        t("devisUpdateStatusError") ?? "Impossible de mettre à jour le statut",
      );
    }
  };

  const handleSaveResponse = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await api.put(
        `/devis/${id}`,
        {
          adminResponse: response,
          status: "answered",
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setDevis(res.data.data);
      setSuccessModal({
        visible: true,
        title: t("success") ?? "Succès",
        message: t("devisResponseSaved") ?? "Réponse enregistrée",
      });
    } catch (error) {
      Alert.alert(
        t("error") ?? "Erreur",
        t("devisSaveResponseError") ?? "Impossible d'enregistrer la réponse",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      const token = await getToken();
      await api.delete(`/devis/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowDeleteModal(false);
      router.back();
    } catch (error) {
      setShowDeleteModal(false);
      Alert.alert(
        t("error") ?? "Erreur",
        t("devisDeleteError") ?? "Impossible de supprimer la demande",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !devis) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const productName =
    typeof devis.product === "object" && devis.product ? devis.product.name : null;

  const InfoRow = ({
    icon,
    label,
    value,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string | number;
  }) => (
    <View className="flex-row items-start mb-3">
      <View
        className="w-8 h-8 rounded-full items-center justify-center mr-3 mt-0.5"
        style={{ backgroundColor: `${COLORS.primary}14` }}
      >
        <Ionicons name={icon} size={15} color={COLORS.primary} />
      </View>
      <View className="flex-1">
        <Text
          className="text-[10px] font-bold uppercase"
          style={{ color: DEVIS_COLORS.muted, letterSpacing: 0.5 }}
        >
          {label}
        </Text>
        <Text className="text-[14px] font-semibold mt-0.5" style={{ color: DEVIS_COLORS.ink }}>
          {value}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Header title={t("devisRequest") ?? "Demande de devis"} showBack />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* ------- En-tête compact ------- */}
        <View className="flex-row items-center mb-5">
          <View
            className="w-12 h-12 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: COLORS.primary }}
          >
            <Text className="text-white font-bold text-[16px]">{initials(devis.name)}</Text>
          </View>
          <View>
            <Text className="font-bold text-[17px]" style={{ color: DEVIS_COLORS.ink }}>
              {devis.name}
            </Text>
            <Text className="text-[12px]" style={{ color: DEVIS_COLORS.muted }}>
              {formatDevisDate(devis.createdAt)}
            </Text>
          </View>
        </View>

        {/* ------- Informations ------- */}
        <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: DEVIS_COLORS.surface }}>
          <InfoRow icon="call-outline" label={t("devisPhone") ?? "Téléphone"} value={devis.phone} />
          {devis.email ? (
            <InfoRow icon="mail-outline" label={t("devisEmail") ?? "Email"} value={devis.email} />
          ) : null}
          {productName ? (
            <InfoRow icon="pricetag-outline" label={t("product") ?? "Produit"} value={productName} />
          ) : null}
          <InfoRow icon="layers-outline" label={t("devisQuantity") ?? "Quantité"} value={devis.quantity} />
          {devis.size ? (
            <InfoRow icon="resize-outline" label={t("sizeLabel") ?? "Taille"} value={devis.size} />
          ) : null}

          <View className="flex-row items-start" style={{ marginTop: 4 }}>
            <View
              className="w-8 h-8 rounded-full items-center justify-center mr-3 mt-0.5"
              style={{ backgroundColor: `${COLORS.primary}14` }}
            >
              <Ionicons name="chatbox-outline" size={15} color={COLORS.primary} />
            </View>
            <View className="flex-1">
              <Text
                className="text-[10px] font-bold uppercase"
                style={{ color: DEVIS_COLORS.muted, letterSpacing: 0.5 }}
              >
                {t("devisMessage") ?? "Message"}
              </Text>
              <Text className="text-[13px] mt-1" style={{ color: DEVIS_COLORS.ink }}>
                {devis.message}
              </Text>
            </View>
          </View>
        </View>

        {/* ------- Statut ------- */}
        <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: DEVIS_COLORS.surface }}>
          <Text className="text-[11px] font-bold mb-3" style={{ color: DEVIS_COLORS.muted, letterSpacing: 0.5 }}>
            {(t("status") ?? "STATUT").toUpperCase()}
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {DEVIS_STATUS_ORDER.map((key) => {
              const meta = DEVIS_STATUS_META[key];
              const label = t(DEVIS_STATUS_KEYS[key]) ?? meta.fallbackLabel;
              const active = devis.status === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => handleStatusChange(key)}
                  className="flex-row items-center px-3 py-2 rounded-full"
                  style={{
                    backgroundColor: active ? meta.color : "#fff",
                    borderWidth: 1.5,
                    borderColor: active ? meta.color : DEVIS_COLORS.line,
                  }}
                >
                  <Ionicons name={meta.icon} size={13} color={active ? "#fff" : meta.color} />
                  <Text
                    className="font-bold ml-1.5"
                    style={{ color: active ? "#fff" : DEVIS_COLORS.subink, fontSize: 12 }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ------- Réponse ------- */}
        <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: DEVIS_COLORS.surface }}>
          <Text className="text-[11px] font-bold mb-3" style={{ color: DEVIS_COLORS.muted, letterSpacing: 0.5 }}>
            {(t("devisResponse") ?? "RÉPONSE À ENVOYER AU CLIENT").toUpperCase()}
          </Text>
          <TextInput
            className="rounded-2xl px-4 py-3"
            style={{
              backgroundColor: "#fff",
              color: DEVIS_COLORS.ink,
              minHeight: 100,
              textAlignVertical: "top",
            }}
            value={response}
            onChangeText={setResponse}
            multiline
            placeholder={t("devisResponsePlaceholder") ?? "Votre réponse / devis proposé..."}
            placeholderTextColor="#ABABB2"
          />
          <TouchableOpacity
            onPress={handleSaveResponse}
            disabled={saving}
            className="rounded-full py-4 items-center flex-row justify-center mt-3"
            style={{ backgroundColor: saving ? "#EDEDF0" : COLORS.primary }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={16} color="#fff" />
                <Text className="text-white font-bold text-[15px] ml-2">
                  {t("devisSaveResponse") ?? "Enregistrer la réponse"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ------- Supprimer ------- */}
        <TouchableOpacity
          onPress={() => setShowDeleteModal(true)}
          className="rounded-full py-4 items-center flex-row justify-center"
          style={{ backgroundColor: "#FEE2E2" }}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text className="font-bold text-[14px] ml-2" style={{ color: "#EF4444" }}>
            {t("devisDelete") ?? "Supprimer la demande"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ------- Modal de confirmation de suppression ------- */}
      <ConfirmDeleteModal
        visible={showDeleteModal}
        title={t("devisDelete") ?? "Supprimer"}
        message={t("devisDeleteConfirm") ?? "Confirmer la suppression de cette demande ?"}
        itemName={devis.name}
        cancelText={t("cancel") ?? "Annuler"}
        confirmText={t("delete") ?? "Supprimer"}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />

      {/* ------- Modal de confirmation de succès ------- */}
      <SuccessModal
        visible={successModal.visible}
        title={successModal.title}
        message={successModal.message}
        buttonText="OK"
        onClose={() => setSuccessModal((prev) => ({ ...prev, visible: false }))}
      />
    <AdminBottomMenu />
    </SafeAreaView>
  );
}