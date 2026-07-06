import "expo-dev-client";
import { Stack } from "expo-router";
import "@/global.css";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from "react-native-toast-message";
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { LanguageProvider } from "@/context/LanguageContext";
import ChatBot from "@/components/ChatBot";
import { NotificationProvider } from "@/context/NotificationContext";
import { StripeProvider } from "@stripe/stripe-react-native";
import { CurrencyProvider } from "@/context/CurrencyContext"; 

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <CurrencyProvider>
          <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
            <ClerkLoaded>
              <StripeProvider
                publishableKey={stripePublishableKey}
                merchantIdentifier="merchant.com.helmihamdi.mobile"
              >
                <NotificationProvider>
                  <CartProvider>
                    <WishlistProvider>
                      <Stack screenOptions={{ headerShown: false }} />
                      <Toast />
                      <ChatBot />
                    </WishlistProvider>
                  </CartProvider>
                </NotificationProvider>
              </StripeProvider>
            </ClerkLoaded>
          </ClerkProvider>
        </CurrencyProvider> 
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}