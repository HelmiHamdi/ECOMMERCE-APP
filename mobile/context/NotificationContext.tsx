import React, { createContext, useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import api from "@/constants/api";
import { useUser, useAuth } from "@clerk/clerk-expo";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const NotificationContext = createContext<{}>({});

const isExpoGo = Constants.appOwnership === "expo";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  const registerForPushNotifications = async () => {
    // Push notifications désactivées dans Expo Go (SDK 53+) — nécessite un dev build
    if (isExpoGo) {
      console.log("⚠️ Push notifications désactivées dans Expo Go. Utilise un development build.");
      return;
    }

    if (!Device.isDevice) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const expoPushToken = tokenData.data;

      const authToken = await getToken();
      await api.post(
        "/users/push-token",
        { expoPushToken },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
    } catch (error) {
      console.error("Erreur sauvegarde token:", error);
    }
  };

  useEffect(() => {
    if (!isSignedIn) return;
    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification reçue:", notification.request.content.title);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const productId = response.notification.request.content.data?.productId;
        if (productId) {
          router.push({
            pathname: "/product/[id]",
            params: { id: String(productId) },
          });
        }
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isSignedIn]);

  return <NotificationContext.Provider value={{}}>{children}</NotificationContext.Provider>;
}