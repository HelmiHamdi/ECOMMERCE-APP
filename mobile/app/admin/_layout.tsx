import { Stack } from "expo-router";

export default function AdminRootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="users"
        options={{ headerShown: true, title: "Utilisateurs" }}
      />
      <Stack.Screen
        name="orders-list"
        options={{ headerShown: true, title: "Commandes" }}
      />
      <Stack.Screen name="gifs" options={{ headerShown: false }} />
      <Stack.Screen
        name="offers"
        options={{ headerShown: true, title: "Offres" }}
      />
      <Stack.Screen
        name="support"
        options={{ headerShown: true, title: "Support" }}
      />
      <Stack.Screen
        name="devis"
        options={{ headerShown: true, title: "Demandes de devis" }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{ headerShown: true, title: "Conversation" }}
      />
      <Stack.Screen name="chat/call/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}