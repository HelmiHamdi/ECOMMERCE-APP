/*import axios from "axios"

const api = axios.create({baseURL: "https://shop-mobile-server.vercel.app/api"})

export default api;*/
/* changed */
import axios from "axios"
import { Platform } from "react-native"

const LOCAL_API_URL = Platform.select({
    android: "http://192.168.10.136:3000/api",
    ios: "http://192.168.10.136:3000/api",
    default:"http://localhost:3000/api"
})


// même en GET — typiquement les données de session utilisateur
// qui doivent toujours refléter l'état serveur le plus récent.
const NO_CACHE_RESOURCES = ["users"];


const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const api = axios.create({
  baseURL:"https://shop-mobile-server.vercel.app/api",
  timeout: 10000,
});

const getResource = (url: string) => url.replace(/^\//, "").split("/")[0];

// Intercepteur REQUEST — vérifie le cache avant d'envoyer
api.interceptors.request.use((config) => {
  const resource = getResource(config.url || "");
  const isExcluded = NO_CACHE_RESOURCES.includes(resource);

  if (config.method?.toLowerCase() === "get" && !isExcluded) {
    const key = config.url + JSON.stringify(config.params || {});
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // Retourne les données cachées sans faire de requête réseau
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
  const resource = getResource(response.config.url || "");
  const isExcluded = NO_CACHE_RESOURCES.includes(resource);

  if (response.config.method?.toLowerCase() === "get" && !isExcluded) {
    const key =
      response.config.url + JSON.stringify(response.config.params || {});
    cache.set(key, { data: response.data, timestamp: Date.now() });
  }
  return response;
});


api.interceptors.response.use((response) => {
  const method = response.config.method?.toLowerCase();
  if (method === "post" || method === "put" || method === "delete") {

    const url = response.config.url || "";
    const resource = url.replace(/^\//, "").split("/")[0]; 
    cache.forEach((_, key) => {
      if (key.includes(resource)) cache.delete(key);
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
