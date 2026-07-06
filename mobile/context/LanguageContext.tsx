import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18n } from "i18n-js";
import * as Localization from "expo-localization";
import en from "@/constants/translations/en.json";
import fr from "@/constants/translations/fr.json";
import ar from "@/constants/translations/ar.json";

const i18n = new I18n({ en, fr, ar });
i18n.enableFallback = true;
i18n.defaultLocale = "en";

export type Language = "en" | "fr" | "ar";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, options?: object) => string;
  isRTL: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const STORAGE_KEY = "appLanguage";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && ["en", "fr", "ar"].includes(stored)) {
          i18n.locale = stored;
          setLanguageState(stored as Language);
        } else {
          const deviceLang = Localization.getLocales()[0]?.languageCode ?? "en";
          const lang = ["en", "fr", "ar"].includes(deviceLang) ? deviceLang : "en";
          i18n.locale = lang;
          setLanguageState(lang as Language);
        }
      } catch (e) {
        i18n.locale = "en";
      }
    })();
  }, []);

  const setLanguage = async (lang: Language) => {
    i18n.locale = lang;
    setLanguageState(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  };

  
  const t = useCallback(
    (key: string, options?: object) => i18n.t(key, options),
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, isRTL: language === "ar" }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}