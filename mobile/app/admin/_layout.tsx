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
        name="gifs"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="offers"
        options={{ headerShown: true, title: "Offres" }}
      />
      <Stack.Screen
        name="support"
        options={{ headerShown: true, title: "Support" }}
      />
    </Stack>
  );
}