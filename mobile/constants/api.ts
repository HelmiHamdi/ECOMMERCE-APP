import axios from "axios";
import { Platform } from "react-native";

const LOCAL_API_URL = Platform.select({
  android: "http://192.168.100.12:3000/api",
  ios: "http://192.168.100.12:3000/api",
  default: "http://localhost:3000/api",
});

// ✅ "admin" ajouté : stats et charts dépendent des commandes, produits, utilisateurs
const NO_CACHE_RESOURCES = [
  "users",
  "support",
  "cart",
  "devis",
  "settings",
  "notes",
  "admin",
];

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

type TokenGetter = (opts?: { skipCache?: boolean }) => Promise<string | null>;
let tokenGetter: TokenGetter | null = null;
export const registerTokenGetter = (fn: TokenGetter) => {
  tokenGetter = fn;
};

const api = axios.create({
  baseURL: "https://shop-mobile-server.vercel.app/api",
  timeout: 20000,
});

const CACHE_STATUS_TEXT = "OK (cache)";

const isExcludedFromCache = (url: string) =>
  NO_CACHE_RESOURCES.some((r) => url.includes(r));

const getResourceName = (url: string) => url.replace(/^\//, "").split("/")[0];

const getCacheKey = (config: any) => {
  const authHeader = config.headers?.Authorization || "anonymous";
  return `${authHeader}::${config.url}${JSON.stringify(config.params || {})}`;
};

// Lecture du cache
api.interceptors.request.use((config) => {
  const isExcluded = isExcludedFromCache(config.url || "");

  if (config.method?.toLowerCase() === "get" && !isExcluded) {
    const key = getCacheKey(config);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      config.adapter = () =>
        Promise.resolve({
          data: cached.data,
          status: 200,
          statusText: CACHE_STATUS_TEXT,
          headers: {},
          config,
        });
    }
  }
  return config;
});

// Écriture du cache (uniquement pour les vraies réponses réseau)
api.interceptors.response.use((response) => {
  const isExcluded = isExcludedFromCache(response.config.url || "");
  // ✅ Fix TTL glissant : on ne recache pas une réponse qui vient déjà du cache
  const fromCache = response.statusText === CACHE_STATUS_TEXT;

  if (
    response.config.method?.toLowerCase() === "get" &&
    !isExcluded &&
    !fromCache
  ) {
    const key = getCacheKey(response.config);
    cache.set(key, { data: response.data, timestamp: Date.now() });
  }
  return response;
});

// Invalidation après une modification
api.interceptors.response.use((response) => {
  const method = response.config.method?.toLowerCase();
  if (
    method === "patch" ||
    method === "post" ||
    method === "put" ||
    method === "delete"
  ) {
    const url = response.config.url || "";
    const resource = getResourceName(url);

    cache.forEach((_, key) => {
      if (key.includes(`::/${resource}`)) {
        cache.delete(key);
      }
    });
  }
  return response;
});

// Refresh du token sur 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      tokenGetter
    ) {
      originalRequest._retry = true;
      try {
        const freshToken = await tokenGetter({ skipCache: true });
        if (freshToken) {
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${freshToken}`,
          };
          return api(originalRequest);
        }
      } catch (refreshErr) {
        console.error("Erreur lors du rafraîchissement du token:", refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export const clearCache = (resource?: string) => {
  if (resource) {
    cache.forEach((_, key) => {
      if (key.includes(resource)) cache.delete(key);
    });
  } else {
    cache.clear();
  }
};

export default api;