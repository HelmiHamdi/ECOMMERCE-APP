import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { registerTokenGetter } from "@/constants/api";


export default function AuthTokenBridge() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    registerTokenGetter(async (opts) => {
      try {
        return await getToken(opts as any);
      } catch {
        return null;
      }
    });
  }, [isLoaded, isSignedIn, getToken]);

  return null;
}