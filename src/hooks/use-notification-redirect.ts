// src/hooks/use-notification-redirect.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";

const LAST_NOTIFIED_KEY = "@geopush/geofence-last-notified";

async function redirect(
  response: Notifications.NotificationResponse | null,
): Promise<void> {
  // Un tap sur la notification elle-même, pas sur un bouton d'action
  if (response?.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER)
    return;

  // Le contenu vient de l'extérieur : on n'accepte que les routes existantes.
  const url = response.notification.request.content.data?.url;
  const reminderId = response.notification.request.content.data?.reminderId;
  if (typeof reminderId === "string") {
    const stored = await AsyncStorage.getItem(LAST_NOTIFIED_KEY);
    const lastNotified = stored
      ? (JSON.parse(stored) as Record<string, number>)
      : {};
    lastNotified[reminderId] = Date.now();
    await AsyncStorage.setItem(LAST_NOTIFIED_KEY, JSON.stringify(lastNotified));
  }

  if (url === "/place-map") {
    router.push({ pathname: "/place-map", params: { mode: "view" } });
  }

  // Pour ne pas rejouer ce tap au prochain rechargement
  Notifications.clearLastNotificationResponse();
}

export function useNotificationRedirect() {
  useEffect(() => {
    let isMounted = true;

    // Appli fermée : le tap qui l'a lancée
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (isMounted) void redirect(response);
    });
    // Appli ouverte ou en arrière-plan
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => void redirect(response),
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);
}
