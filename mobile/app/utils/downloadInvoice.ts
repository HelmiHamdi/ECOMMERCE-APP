import Toast from "react-native-toast-message";
import api from "@/constants/api";

export async function downloadInvoice(
  orderId: string,
  orderNumber: string,
  getToken: () => Promise<string | null>
) {
  try {
    // Import dynamique pour éviter le crash natif si le module n'est pas dans le build
    const FileSystem = await import("expo-file-system/legacy").catch(() => null);
    const Sharing = await import("expo-sharing").catch(() => null);

    if (!FileSystem || !Sharing) {
      Toast.show({
        type: "error",
        text1: "Fonctionnalité non disponible",
        text2: "Un rebuild de l'app est nécessaire pour cette fonction.",
      });
      return;
    }

    const token = await getToken();
    const baseURL = api.defaults.baseURL;

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
    } else {
      Toast.show({
        type: "info",
        text1: "Fichier téléchargé",
        text2: `Disponible dans les fichiers de l'app.`,
      });
    }
  } catch (error) {
    console.error("Erreur téléchargement facture:", error);
    Toast.show({
      type: "error",
      text1: "Impossible de télécharger la facture",
    });
  }
}