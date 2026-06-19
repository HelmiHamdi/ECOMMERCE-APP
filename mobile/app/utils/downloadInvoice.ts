import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import Toast from "react-native-toast-message";
import api from "@/constants/api";

export async function downloadInvoice(
  orderId: string,
  orderNumber: string,
  getToken: () => Promise<string | null>
) {
  try {
    const token = await getToken();
    const baseURL = api.defaults.baseURL; // ⚠️ vérifie que ça correspond à ta config dans constants/api

    const fileUri = `${FileSystem.documentDirectory}facture-${orderNumber}.pdf`;

    const downloadResumable = FileSystem.createDownloadResumable(
      `${baseURL}/orders/${orderId}/invoice`,
      fileUri,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result) throw new Error("Téléchargement échoué");

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(result.uri, {
        mimeType: "application/pdf",
        dialogTitle: `Facture ${orderNumber}`,
      });
    }
  } catch (error) {
    console.error("Erreur téléchargement facture:", error);
    Toast.show({ text1: "Impossible de télécharger la facture", type: "error" });
  }
}