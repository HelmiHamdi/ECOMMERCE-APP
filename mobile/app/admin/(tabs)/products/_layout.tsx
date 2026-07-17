import { Stack } from "expo-router";
import { COLORS } from "@/constants";
import { useLanguage } from "@/context/LanguageContext";

export default function ProductsLayout() {
    const { t } = useLanguage();

    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: "#fff" },
                headerTintColor: COLORS.primary,
                headerTitleStyle: { fontWeight: "bold" },
                headerShadowVisible: false,
                
                
            }}
        >
            <Stack.Screen name="index" options={{ title: t("manageProducts"), headerShown: false }} />
            <Stack.Screen name="add" options={{ title: t("addProduct") }} />
            <Stack.Screen name="edit/[id]" options={{ title: t("editProduct") }} />
        </Stack>
    );
}