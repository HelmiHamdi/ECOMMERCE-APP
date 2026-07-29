
const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL as string; // ex: https://ineshop-socket.onrender.com
const INTERNAL_SOCKET_SECRET = process.env.INTERNAL_SOCKET_SECRET as string;

export const emitToRooms = async (
  rooms: string[],
  event: string,
  payload: any
): Promise<void> => {
  if (!SOCKET_SERVER_URL || !INTERNAL_SOCKET_SECRET) {
    console.error("SOCKET RELAY: variables d'env manquantes (SOCKET_SERVER_URL / INTERNAL_SOCKET_SECRET)");
    return;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${SOCKET_SERVER_URL}/internal/socket-emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SOCKET_SECRET,
      },
      body: JSON.stringify({ rooms, event, payload }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error("SOCKET RELAY: réponse non-OK", res.status);
    }
  } catch (err: any) {
    // ✅ Non-bloquant : le message est déjà sauvé en DB, on ne fait jamais
    // échouer la requête HTTP principale à cause d'un souci de relay socket.
    console.error("SOCKET RELAY ERROR (non-bloquant):", err.message);
  }
};