import { Request, Response, NextFunction } from "express";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

const EXCLUDED_PREFIXES = [
  "/api/users",
];

const EXCLUDED_PATTERNS = [
  /\/invoice/,
];

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

  const key = req.originalUrl;
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