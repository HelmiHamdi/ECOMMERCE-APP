import { Request, Response, NextFunction } from "express";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

const EXCLUDED_PREFIXES = [
  "/api/users",
  "/api/cart",
  "/api/addresses",
  "/api/notes", // les notes ne doivent JAMAIS être servies depuis le cache serveur
  "/api/admin", // ✅ stats et charts dépendent des commandes, produits, utilisateurs
];

const EXCLUDED_PATTERNS = [/\/invoice/];

// ✅ Pas d'utilisateur identifié => pas de clé => pas de cache
// (évite de servir des données privées à quelqu'un d'autre)
const getCacheKey = (req: Request): string | null => {
  const userId = (req.user as any)?._id?.toString();
  return userId ? `${userId}::${req.originalUrl}` : null;
};

export const cacheMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.method !== "GET") return next();

  if (EXCLUDED_PREFIXES.some((prefix) => req.originalUrl.startsWith(prefix))) {
    return next();
  }

  if (EXCLUDED_PATTERNS.some((pattern) => pattern.test(req.originalUrl))) {
    return next();
  }

  const key = getCacheKey(req);
  if (!key) return next();

  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data);
  }

  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (res.statusCode === 200) {
      cache.set(key, { data: body, timestamp: Date.now() });
    }
    return originalJson(body);
  };

  next();
};

export const invalidateCache = (resource: string) => {
  cache.forEach((_, key) => {
    if (key.includes(resource)) cache.delete(key);
  });
};