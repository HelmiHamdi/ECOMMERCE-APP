const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  // ------- Maghreb / Machrek (déjà présents) -------
  "tunisie": "TN", "tunisia": "TN", "تونس": "TN",
  "algerie": "DZ", "algérie": "DZ", "algeria": "DZ", "الجزائر": "DZ",
  "maroc": "MA", "morocco": "MA", "المغرب": "MA",
  "libye": "LY", "libya": "LY", "ليبيا": "LY",
  "egypte": "EG", "égypte": "EG", "egypt": "EG", "مصر": "EG",

  // ------- Europe de l'Ouest -------
  "france": "FR",
  "italie": "IT", "italy": "IT", "italia": "IT",
  "espagne": "ES", "spain": "ES", "españa": "ES",
  "allemagne": "DE", "germany": "DE", "deutschland": "DE",
  "belgique": "BE", "belgium": "BE", "belgië": "BE",
  "suisse": "CH", "switzerland": "CH", "schweiz": "CH",
  "royaume-uni": "GB", "united kingdom": "GB", "uk": "GB", "england": "GB",
  "pays-bas": "NL", "netherlands": "NL", "nederland": "NL", "hollande": "NL",
  "autriche": "AT", "austria": "AT", "österreich": "AT",
  "irlande": "IE", "ireland": "IE",
  "luxembourg": "LU",
  "monaco": "MC",
  "andorre": "AD", "andorra": "AD",
  "liechtenstein": "LI",
  "vatican": "VA", "saint-siege": "VA", "saint-siège": "VA", "vatican city": "VA",
  "saint-marin": "SM", "san marino": "SM",
  "portugal": "PT",

  // ------- Europe du Nord -------
  "suede": "SE", "suède": "SE", "sweden": "SE", "sverige": "SE",
  "norvege": "NO", "norvège": "NO", "norway": "NO",
  "danemark": "DK", "denmark": "DK",
  "finlande": "FI", "finland": "FI",
  "islande": "IS", "iceland": "IS",

  // ------- Europe de l'Est / Centrale -------
  "pologne": "PL", "poland": "PL", "polska": "PL",
  "republique tcheque": "CZ", "république tchèque": "CZ", "czech republic": "CZ", "tchequie": "CZ", "tchéquie": "CZ",
  "slovaquie": "SK", "slovakia": "SK",
  "hongrie": "HU", "hungary": "HU",
  "roumanie": "RO", "romania": "RO",
  "bulgarie": "BG", "bulgaria": "BG",
  "slovenie": "SI", "slovénie": "SI", "slovenia": "SI",
  "croatie": "HR", "croatia": "HR",
  "bosnie-herzegovine": "BA", "bosnie": "BA", "bosnia and herzegovina": "BA",
  "serbie": "RS", "serbia": "RS",
  "montenegro": "ME", "monténégro": "ME",
  "macedoine du nord": "MK", "macédoine du nord": "MK", "north macedonia": "MK",
  "albanie": "AL", "albania": "AL",
  "kosovo": "XK",
  "grece": "GR", "grèce": "GR", "greece": "GR",
  "chypre": "CY", "cyprus": "CY",
  "malte": "MT", "malta": "MT",
  "ukraine": "UA",
  "belarus": "BY", "bielorussie": "BY", "biélorussie": "BY",
  "moldavie": "MD", "moldova": "MD",
  "lituanie": "LT", "lithuania": "LT",
  "lettonie": "LV", "latvia": "LV",
  "estonie": "EE", "estonia": "EE",
  "russie": "RU", "russia": "RU",

  // ------- Amérique du Nord -------
  "etats-unis": "US", "états-unis": "US", "usa": "US", "united states": "US",
  "canada": "CA",
  "mexique": "MX", "mexico": "MX", "méxico": "MX",

  // ------- Amérique centrale / Caraïbes -------
  "guatemala": "GT",
  "belize": "BZ",
  "honduras": "HN",
  "el salvador": "SV",
  "nicaragua": "NI",
  "costa rica": "CR",
  "panama": "PA",
  "cuba": "CU",
  "jamaique": "JM", "jamaïque": "JM", "jamaica": "JM",
  "haiti": "HT", "haïti": "HT",
  "republique dominicaine": "DO", "république dominicaine": "DO", "dominican republic": "DO",
  "bahamas": "BS",
  "barbade": "BB", "barbados": "BB",
  "trinite-et-tobago": "TT", "trinité-et-tobago": "TT", "trinidad and tobago": "TT",
  "dominique": "DM", "dominica": "DM",
  "grenade": "GD", "grenada": "GD",
  "sainte-lucie": "LC", "saint lucia": "LC",
  "antigua-et-barbuda": "AG", "antigua and barbuda": "AG",
  "saint-kitts-et-nevis": "KN", "saint kitts and nevis": "KN",
  "saint-vincent-et-les-grenadines": "VC", "saint vincent and the grenadines": "VC",

  // ------- Amérique du Sud -------
  "bresil": "BR", "brésil": "BR", "brazil": "BR", "brasil": "BR",
  "argentine": "AR", "argentina": "AR",
  "chili": "CL", "chile": "CL",
  "colombie": "CO", "colombia": "CO",
  "perou": "PE", "pérou": "PE", "peru": "PE",
  "venezuela": "VE",
  "equateur": "EC", "équateur": "EC", "ecuador": "EC",
  "bolivie": "BO", "bolivia": "BO",
  "paraguay": "PY",
  "uruguay": "UY",
  "guyana": "GY",
  "suriname": "SR",

  // ------- Moyen-Orient / Golfe -------
  "emirats arabes unis": "AE", "émirats arabes unis": "AE", "uae": "AE", "الإمارات": "AE",
  "arabie saoudite": "SA", "saudi arabia": "SA", "السعودية": "SA",
  "qatar": "QA", "قطر": "QA",
  "koweit": "KW", "koweït": "KW", "kuwait": "KW", "الكويت": "KW",
  "bahrein": "BH", "bahreïn": "BH", "bahrain": "BH", "البحرين": "BH",
  "oman": "OM", "عمان": "OM",
  "yemen": "YE", "yémen": "YE", "اليمن": "YE",
  "irak": "IQ", "iraq": "IQ", "العراق": "IQ",
  "iran": "IR", "إيران": "IR",
  "syrie": "SY", "syria": "SY", "سوريا": "SY",
  "liban": "LB", "lebanon": "LB", "لبنان": "LB",
  "jordanie": "JO", "jordan": "JO", "الأردن": "JO",
  "israel": "IL", "israël": "IL",
  "palestine": "PS", "فلسطين": "PS",
  "turquie": "TR", "turkey": "TR",

  // ------- Asie centrale -------
  "kazakhstan": "KZ",
  "ouzbekistan": "UZ", "ouzbékistan": "UZ", "uzbekistan": "UZ",
  "turkmenistan": "TM", "turkménistan": "TM",
  "kirghizistan": "KG", "kyrgyzstan": "KG",
  "tadjikistan": "TJ", "tajikistan": "TJ",
  "afghanistan": "AF",
  "armenie": "AM", "arménie": "AM", "armenia": "AM",
  "azerbaidjan": "AZ", "azerbaïdjan": "AZ", "azerbaijan": "AZ",
  "georgie": "GE", "géorgie": "GE", "georgia": "GE",

  // ------- Asie du Sud -------
  "inde": "IN", "india": "IN",
  "pakistan": "PK",
  "bangladesh": "BD",
  "sri lanka": "LK",
  "nepal": "NP", "népal": "NP",
  "bhoutan": "BT", "bhutan": "BT",
  "maldives": "MV",

  // ------- Asie de l'Est -------
  "chine": "CN", "china": "CN",
  "japon": "JP", "japan": "JP",
  "coree du sud": "KR", "corée du sud": "KR", "south korea": "KR",
  "coree du nord": "KP", "corée du nord": "KP", "north korea": "KP",
  "mongolie": "MN", "mongolia": "MN",
  "taiwan": "TW", "taïwan": "TW",

  // ------- Asie du Sud-Est -------
  "vietnam": "VN",
  "thailande": "TH", "thaïlande": "TH", "thailand": "TH",
  "indonesie": "ID", "indonésie": "ID", "indonesia": "ID",
  "malaisie": "MY", "malaysia": "MY",
  "singapour": "SG", "singapore": "SG",
  "philippines": "PH",
  "cambodge": "KH", "cambodia": "KH",
  "laos": "LA",
  "myanmar": "MM", "birmanie": "MM",
  "brunei": "BN",
  "timor oriental": "TL", "timor-leste": "TL", "east timor": "TL",

  // ------- Afrique du Nord (hors Maghreb déjà listé) -------
  "mauritanie": "MR", "mauritania": "MR", "موريتانيا": "MR",
  "soudan": "SD", "sudan": "SD", "السودان": "SD",
  "soudan du sud": "SS", "south sudan": "SS",

  // ------- Afrique de l'Ouest -------
  "senegal": "SN", "sénégal": "SN",
  "mali": "ML",
  "niger": "NE",
  "burkina faso": "BF",
  "cote d'ivoire": "CI", "côte d'ivoire": "CI", "ivory coast": "CI",
  "ghana": "GH",
  "togo": "TG",
  "benin": "BJ", "bénin": "BJ",
  "nigeria": "NG",
  "guinee": "GN", "guinée": "GN", "guinea": "GN",
  "guinee-bissau": "GW", "guinée-bissau": "GW", "guinea-bissau": "GW",
  "guinee equatoriale": "GQ", "guinée équatoriale": "GQ", "equatorial guinea": "GQ",
  "sierra leone": "SL",
  "liberia": "LR",
  "gambie": "GM", "gambia": "GM",
  "cap-vert": "CV", "cabo verde": "CV", "cape verde": "CV",

  // ------- Afrique centrale -------
  "cameroun": "CM", "cameroon": "CM",
  "tchad": "TD", "chad": "TD",
  "republique centrafricaine": "CF", "république centrafricaine": "CF", "central african republic": "CF",
  "gabon": "GA",
  "congo": "CG", "republique du congo": "CG", "république du congo": "CG",
  "republique democratique du congo": "CD", "république démocratique du congo": "CD", "rdc": "CD", "dr congo": "CD",
  "sao tome-et-principe": "ST", "sao tome and principe": "ST",

  // ------- Afrique de l'Est -------
  "ethiopie": "ET", "éthiopie": "ET", "ethiopia": "ET",
  "kenya": "KE",
  "tanzanie": "TZ", "tanzania": "TZ",
  "ouganda": "UG", "uganda": "UG",
  "rwanda": "RW",
  "burundi": "BI",
  "somalie": "SO", "somalia": "SO", "الصومال": "SO",
  "djibouti": "DJ", "جيبوتي": "DJ",
  "erythree": "ER", "érythrée": "ER", "eritrea": "ER",
  "comores": "KM", "comoros": "KM", "جزر القمر": "KM",
  "madagascar": "MG",
  "maurice": "MU", "mauritius": "MU",
  "seychelles": "SC",
  "malawi": "MW",
  "zambie": "ZM", "zambia": "ZM",
  "mozambique": "MZ",

  // ------- Afrique australe -------
  "afrique du sud": "ZA", "south africa": "ZA",
  "namibie": "NA", "namibia": "NA",
  "botswana": "BW",
  "zimbabwe": "ZW",
  "eswatini": "SZ", "swaziland": "SZ",
  "lesotho": "LS",
  "angola": "AO",

  // ------- Océanie -------
  "australie": "AU", "australia": "AU",
  "nouvelle-zelande": "NZ", "nouvelle-zélande": "NZ", "new zealand": "NZ",
  "papouasie-nouvelle-guinee": "PG", "papouasie-nouvelle-guinée": "PG", "papua new guinea": "PG",
  "fidji": "FJ", "fiji": "FJ",
  "vanuatu": "VU",
  "samoa": "WS",
  "tonga": "TO",
  "iles salomon": "SB", "îles salomon": "SB", "solomon islands": "SB",
  "kiribati": "KI",
  "micronesie": "FM", "micronésie": "FM", "micronesia": "FM",
  "iles marshall": "MH", "îles marshall": "MH", "marshall islands": "MH",
  "palaos": "PW", "palau": "PW",
  "nauru": "NR",
  "tuvalu": "TV",
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