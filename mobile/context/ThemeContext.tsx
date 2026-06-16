import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeContextType = {
  isDark: boolean;
  toggleTheme: (value: boolean) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { setColorScheme } = useColorScheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("darkModeEnabled");
      const enabled = saved === "true";
      setIsDark(enabled);
      setColorScheme(enabled ? "dark" : "light");
    })();
  }, []);

  const toggleTheme = async (value: boolean) => {
    setIsDark(value);
    setColorScheme(value ? "dark" : "light");
    await AsyncStorage.setItem("darkModeEnabled", String(value));
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};