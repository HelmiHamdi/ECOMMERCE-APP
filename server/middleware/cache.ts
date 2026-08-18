import { Request, Response, NextFunction } from "express";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

const EXCLUDED_PREFIXES = [
  "/api/users",
  "/api/cart",
  "/api/addresses",
  "/api/notes", // 👈 AJOUT — les notes ne doivent JAMAIS être servies depuis le cache serveur
];

const EXCLUDED_PATTERNS = [
  /\/invoice/,
];

const getCacheKey = (req: Request) => {
  const userId = (req.user as any)?._id?.toString() || "anonymous";
  return `${userId}::${req.originalUrl}`;
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