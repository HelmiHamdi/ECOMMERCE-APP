import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Currency = "USD" | "EUR" | "TND";

const RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  TND: 3.1,
};

const SYMBOLS: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  TND: "DT",
};

type CurrencyContextType = {
  currency: Currency;
  setCurrency: (c: Currency) => Promise<void>;
  formatPrice: (priceInUSD: number) => string;
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "USD",
  setCurrency: async () => {},
  formatPrice: (p) => `${p.toFixed(2)} $`,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("USD");

  useEffect(() => {
    AsyncStorage.getItem("currency").then((saved) => {
      if (saved && saved in RATES) setCurrencyState(saved as Currency);
    });
  }, []);

  const setCurrency = async (c: Currency) => {
    setCurrencyState(c);
    await AsyncStorage.setItem("currency", c);
  };

  const formatPrice = (priceInUSD: number) => {
    const converted = priceInUSD * RATES[currency];
    return `${converted.toFixed(2)} ${SYMBOLS[currency]}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);