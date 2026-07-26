import axios from "axios";
import { Platform } from "react-native";

const LOCAL_API_URL = Platform.select({
  android: "http://192.168.194.136:3000/api",
  ios: "http://192.168.194.136:3000/api",
  default: "http://localhost:3000/api",
});

const NO_CACHE_RESOURCES = ["users", "support", "cart", "devis", "settings"];

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

const api = axios.create({
  baseURL: "https://shop-mobile-server.vercel.app/api",
  timeout: 10000,
});

const isExcludedFromCache = (url: string) =>
  NO_CACHE_RESOURCES.some((r) => url.includes(r));

const getResourceName = (url: string) => url.replace(/^\//, "").split("/")[0];


const getCacheKey = (config: any) => {
  const authHeader = config.headers?.Authorization || "anonymous";
  return `${authHeader}::${config.url}${JSON.stringify(config.params || {})}`;
};

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
          statusText: "OK (cache)",
          headers: {},
          config,
        });
    }
  }
  return config;
});

api.interceptors.response.use((response) => {
  const isExcluded = isExcludedFromCache(response.config.url || "");

  if (response.config.method?.toLowerCase() === "get" && !isExcluded) {
    const key = getCacheKey(response.config);
    cache.set(key, { data: response.data, timestamp: Date.now() });
  }
  return response;
});

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