// hooks/useStripePayment.ts
import { useStripe } from "@stripe/stripe-react-native";
import { useState } from "react";
import api from "@/constants/api";
import { useAuth } from "@clerk/clerk-expo";

export const useStripePayment = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const initializePayment = async () => {
    setLoading(true);
    try {
      const token = await getToken();

      // 1. Créer le PaymentIntent côté serveur
      const { data } = await api.post(
        "/payments/create-payment-intent",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!data.success) throw new Error("Failed to create payment intent");

      // 2. Initialiser la feuille de paiement Stripe
      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: data.clientSecret,
        merchantDisplayName: "Mon App",
        defaultBillingDetails: { address: { country: "TN" } },
        style: "automatic",
      });

      if (error) throw new Error(error.message);

      return { clientSecret: data.clientSecret, paymentIntentId: data.paymentIntentId };
    } finally {
      setLoading(false);
    }
  };

  const presentPayment = async () => {
    const { error } = await presentPaymentSheet();
    if (error) {
      if (error.code === "Canceled") return { success: false, canceled: true };
      throw new Error(error.message);
    }
    return { success: true, canceled: false };
  };

  return { initializePayment, presentPayment, loading };
};