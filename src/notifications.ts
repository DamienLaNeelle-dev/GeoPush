// src/notifications.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const DEFAULT_NOTIFICATION_CHANNEL_ID = "default";
export const GEOFENCE_NOTIFICATION_CHANNEL_ID = "geopush-reminders";

// Notification reçue appli ouverte : on l'affiche quand même
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationChannels(): Promise<void> {
  // Catégorie avec le bouton « Y aller » : nécessaire sur iOS ET Android
  await Notifications.setNotificationCategoryAsync("reminder", [
    {
      identifier: "go",
      buttonTitle: "Y aller",
      options: { opensAppToForeground: true },
    },
  ]);

  // Les canaux n'existent que sur Android
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(
    DEFAULT_NOTIFICATION_CHANNEL_ID,
    {
      name: "Général",
      description: "Notifications générales",
      importance: Notifications.AndroidImportance.MAX,
    },
  );
  await Notifications.setNotificationChannelAsync(
    GEOFENCE_NOTIFICATION_CHANNEL_ID,
    {
      name: "Rappels GeoPush",
      description: "Notifications déclenchées près des lieux enregistrés.",
      importance: Notifications.AndroidImportance.DEFAULT,
    },
  );
}

export async function requestNotificationPermission(): Promise<void> {
  const current = await Notifications.getPermissionsAsync();
  const permission =
    current.status === "granted"
      ? current
      : await Notifications.requestPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error("La permission d'envoyer des notifications est requise.");
  }

  await ensureNotificationChannels();
}

export async function scheduleGeofenceNotification(
  reminderTitle: string,
  placeName: string,
  regionIdentifier: string,
  latitude: number,
  longitude: number,
): Promise<void> {
  await requestNotificationPermission();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: reminderTitle,
      body: `Vous êtes près de ${placeName}.`,
      // Affiche le bouton « Y aller » déclaré dans ensureNotificationChannels
      categoryIdentifier: "reminder",
      data: {
        url: "/place-map",
        // Même clé que l'anti-doublon du geofencing
        reminderId: regionIdentifier,
        placeName,
        lat: latitude,
        lon: longitude,
      },
    },
    trigger: null,
  });
}

export async function scheduleTestNotification(
  seconds: number,
  reminderTitle: string,
  placeName: string,
  regionIdentifier: string,
): Promise<void> {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("Le délai de notification doit être supérieur à zéro.");
  }

  await requestNotificationPermission();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: reminderTitle,
      body: `Vous êtes près de ${placeName}.`,
      data: { url: "/place-map", reminderId: regionIdentifier },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: DEFAULT_NOTIFICATION_CHANNEL_ID,
    },
  });
}
