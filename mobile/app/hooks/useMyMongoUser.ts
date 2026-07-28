import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-expo";
import api from "@/constants/api";

export type MongoAdmin = {
  _id: string;
  name?: string;
  email?: string;
  image?: string;
  role?: string;
};

// ⚠️ IMPORTANT : `useUser().id` (Clerk) N'EST PAS le même id que `sender._id` (Mongo)
// renvoyé par le backend. C'était la cause du bug "mauvais nom/avatar en haut du chat"
// et "même admin dans toutes les rooms" : toutes les comparaisons `x._id === user.id`
// étaient toujours fausses (ou toujours vraies par erreur de logique de repli).
//
// Ce hook récupère UNE FOIS le profil Mongo réel (via /chatAdmin/me) et le met en cache
// en mémoire pour toute la session, afin que tous les écrans comparent avec le même id.
let cachedPromise: Promise<MongoAdmin | null> | null = null;

export function useMyMongoUser() {
  const { getToken, isSignedIn } = useAuth();
  const [me, setMe] = useState<MongoAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchMe = async () => {
      if (!isSignedIn) {
        setLoading(false);
        return;
      }
      if (!cachedPromise) {
        cachedPromise = (async () => {
          try {
            const token = await getToken();
            if (!token) return null;
            const res = await api.get("/chatAdmin/me", {
              headers: { Authorization: `Bearer ${token}` },
            });
            return res.data?.data || null;
          } catch (err) {
            console.error("Erreur récupération profil admin (Mongo):", err);
            return null;
          }
        })();
      }
      const data = await cachedPromise;
      if (data === null) {
        // en cas d'échec, on autorise un nouvel essai la prochaine fois
        cachedPromise = null;
      }
      if (mounted) {
        setMe(data);
        setLoading(false);
      }
    };

    fetchMe();
    return () => {
      mounted = false;
    };
  }, [getToken, isSignedIn]);

  return { me, myId: me?._id, loading };
}