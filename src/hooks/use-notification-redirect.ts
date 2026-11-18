// src/hooks/use-notification-redirect.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";

import { openDirections } from "@/services/navigation/navigationService";

const LAST_NOTIFIED_KEY = "@geopush/geofence-last-notified";
export const GO_ACTION_ID = "go";

async function markAsNotified(reminderId: unknown): Promise<void> {
  if (typeof reminderId !== "string") return;
  const stored = await AsyncStorage.getItem(LAST_NOTIFIED_KEY);
  const lastNotified = stored
    ? (JSON.parse(stored) as Record<string, number>)
    : {};
  lastNotified[reminderId] = Date.now();
  await AsyncStorage.setItem(LAST_NOTIFIED_KEY, JSON.stringify(lastNotified));
}

async function redirect(
  response: Notifications.NotificationResponse | null,
): Promise<void> {
  if (!response) return;

  // Le contenu vient de l'extérieur : on vérifie chaque champ.
  const data = response.notification.request.content.data ?? {};
  await markAsNotified(data.reminderId);

  if (response.actionIdentifier === GO_ACTION_ID) {
    // Bouton « Y aller » : ouvre Plans avec l'itinéraire
    if (typeof data.lat === "number" && typeof data.lon === "number") {
      const label =
        typeof data.placeName === "string" ? data.placeName : undefined;
      await openDirections(data.lat, data.lon, label);
    }
  } else if (
    response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
  ) {
    // Tap sur la notification elle-même
    if (data.url === "/place-map") {
      router.push({ pathname: "/place-map", params: { mode: "view" } });
    }
  }

  // Pour ne pas rejouer ce tap au prochain rechargement
  await Notifications.clearLastNotificationResponseAsync();
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
