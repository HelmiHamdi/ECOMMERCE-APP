import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Currency = "USD" | "EUR" | "TND" | "SAR";


export const RATES_FROM_TND: Record<Currency, number> = {
  TND: 1,
  USD: 0.32,
  EUR: 0.30,
  SAR: 1.20,
};

export const SYMBOLS: Record<Currency, string> = {
  TND: "DT",
  USD: "$",
  EUR: "€",
  SAR: "ر.س",
};

export const FLAGS: Record<Currency, string> = {
  TND: "🇹🇳",
  USD: "🇺🇸",
  EUR: "🇪🇺",
  SAR: "🇸🇦",
};

type CurrencyContextType = {
  currency: Currency;
  setCurrency: (c: Currency) => Promise<void>;
  formatPrice: (priceInTND: number) => string;
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "TND",
  setCurrency: async () => {},
  formatPrice: (p) => `${p.toFixed(2)} DT`,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("TND");

  useEffect(() => {
    AsyncStorage.getItem("currency").then((saved) => {
      if (saved && saved in RATES_FROM_TND) setCurrencyState(saved as Currency);
    });
  }, []);

  const setCurrency = async (c: Currency) => {
    setCurrencyState(c);
    await AsyncStorage.setItem("currency", c);
  };

  const formatPrice = (priceInTND: number): string => {
    const converted = priceInTND * RATES_FROM_TND[currency];
    return `${converted.toFixed(2)} ${SYMBOLS[currency]}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);