
const COUNTRY_NAME_TO_ISO: Record<string, string> = {

  "tunisie": "TN", "tunisia": "TN", "تونس": "TN",

  "algerie": "DZ", "algérie": "DZ", "algeria": "DZ", "الجزائر": "DZ",
  
  "maroc": "MA", "morocco": "MA", "المغرب": "MA",
 
  "libye": "LY", "libya": "LY", "ليبيا": "LY",
 
  "egypte": "EG", "égypte": "EG", "egypt": "EG", "مصر": "EG",
 
  "france": "FR",
 
  "italie": "IT", "italy": "IT", "italia": "IT",
 
  "espagne": "ES", "spain": "ES", "españa": "ES",

  "allemagne": "DE", "germany": "DE", "deutschland": "DE",
  
  "belgique": "BE", "belgium": "BE", "belgië": "BE",
 
  "suisse": "CH", "switzerland": "CH", "schweiz": "CH",
 
  "royaume-uni": "GB", "united kingdom": "GB", "uk": "GB", "england": "GB",

  "etats-unis": "US", "états-unis": "US", "usa": "US", "united states": "US",

  "canada": "CA",

  "emirats arabes unis": "AE", "émirats arabes unis": "AE", "uae": "AE", "الإمارات": "AE",
 
  "arabie saoudite": "SA", "saudi arabia": "SA", "السعودية": "SA",

  "qatar": "QA", "قطر": "QA",
};


const isoToFlagEmoji = (iso: string): string => {
  return iso
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
};


export const getCountryFlag = (countryName?: string | null): string => {
  if (!countryName) return "🌍";
  const key = countryName.trim().toLowerCase();
  const iso = COUNTRY_NAME_TO_ISO[key];
  if (!iso) return "🌍";
  return isoToFlagEmoji(iso);
};