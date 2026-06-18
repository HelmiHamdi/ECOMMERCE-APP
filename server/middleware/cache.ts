// middleware/cache.ts
import { Request, Response, NextFunction } from "express";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Routes per-user / mutables : jamais de cache global dessus,
// sinon un utilisateur peut recevoir les données d'un autre,
// ou des données périmées après une mise à jour.
const EXCLUDED_PREFIXES = ["/api/users"];

export const cacheMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Cache uniquement les GET
  if (req.method !== "GET") return next();

  // Routes exclues du cache
  if (EXCLUDED_PREFIXES.some((prefix) => req.originalUrl.startsWith(prefix))) {
    return next();
  }

  const key = req.originalUrl;
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data);
  }

  // Intercepte res.json pour mettre en cache la réponse
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (res.statusCode === 200) {
      cache.set(key, { data: body, timestamp: Date.now() });
    }
    return originalJson(body);
  };

  next();
};

// Vide le cache quand une ressource est modifiée
export const invalidateCache = (resource: string) => {
  cache.forEach((_, key) => {
    if (key.includes(resource)) cache.delete(key);
  });
};