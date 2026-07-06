import { NextFunction, Request, Response } from "express";
import { clerkClient } from "@clerk/express";
import User from "../models/User.js";

/**
 * Récupère l'utilisateur en base. S'il n'existe pas encore (ex: le webhook
 * Clerk n'a pas eu le temps de tourner, ou a échoué), on le crée à la volée
 * à partir des infos Clerk. L'upsert + $setOnInsert évite les doublons en
 * cas de requêtes concurrentes juste après l'inscription.
 */
async function findOrCreateUser(clerkId: string) {
  const existing = await User.findOne({ clerkId });
  if (existing) return existing;

  const clerkUser = await clerkClient.users.getUser(clerkId);

  const user = await User.findOneAndUpdate(
    { clerkId },
    {
      $setOnInsert: {
        clerkId,
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim(),
        image: clerkUser.imageUrl,
      },
    },
    { new: true, upsert: true }
  );

  console.log("✅ Utilisateur créé en fallback (lazy sync):", user?.email);
  return user;
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = await req.auth();
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const user = await findOrCreateUser(userId);
    if (!user) {
      return res.status(500).json({
        success: false,
        message: "Failed to resolve user",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({
      success: false,
      message: "Authentification failed",
    });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = await req.auth();
    if (userId) {
      req.user = await findOrCreateUser(userId);
    }
    next();
  } catch (error) {
    // On ne bloque jamais une route "optionnelle" à cause d'une erreur d'auth
    next();
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "User role is not authorized to access this route",
      });
    }
    next();
  };
};