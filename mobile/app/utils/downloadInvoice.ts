import Toast from "react-native-toast-message";
import { Linking } from "react-native";
import api from "@/constants/api";
import { RATES_FROM_TND } from "@/context/CurrencyContext";

export type SupportedCurrency = "USD" | "EUR" | "TND";

export async function downloadInvoice(
  orderId: string,
  orderNumber: string,
  getToken: () => Promise<string | null>,
  currency: SupportedCurrency = "TND"
) {
  try {
    Toast.show({ type: "info", text1: "Préparation de la facture..." });

    const token = await getToken();
    const rate  = RATES_FROM_TND[currency];

    const { data } = await api.get(
      `/orders/${orderId}/invoice/link?currency=${currency}&rate=${rate}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!data.link) throw new Error("Lien introuvable");

    await Linking.openURL(data.link);

  } catch (error) {
    console.error("Erreur téléchargement facture:", error);
    Toast.show({
      type: "error",
      text1: "Impossible d'ouvrir la facture",
    });
  }
}