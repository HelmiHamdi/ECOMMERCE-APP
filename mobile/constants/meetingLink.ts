import { Linking } from "react-native";

export const normalizeUrl = (url?: string | null) => {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

/**
 * Ouvre un lien de réunion.
 * On n'utilise volontairement PAS Linking.canOpenURL() ici :
 * sur Android, cette vérification échoue souvent pour des liens http/https
 * valides (restriction de visibilité des paquets), ce qui bloquait
 * l'ouverture même quand le lien était correct.
 */
export const openMeetingLink = async (
  rawUrl: string,
  onError: (title: string, message: string) => void,
  errorTitle: string,
  errorMessage: string
) => {
  const url = normalizeUrl(rawUrl);
  if (!url) return;

  try {
    await Linking.openURL(url);
  } catch (err) {
    console.error("OPEN LINK ERROR:", err);
    onError(errorTitle, errorMessage);
  }
};