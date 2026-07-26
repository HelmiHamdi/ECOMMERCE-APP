import api from "@/constants/api";
import { AppSettings } from "@/constants/types";
import { useEffect, useState, useCallback } from "react";


export const useAppSettings = () => {
  const [devisEnabled, setDevisEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/settings");
      const settings: AppSettings = res.data.data;
      setDevisEnabled(!!settings.devisEnabled);
    } catch (error) {
      console.error("Erreur chargement settings:", error);
      setDevisEnabled(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { devisEnabled, loading, refresh: load };
};