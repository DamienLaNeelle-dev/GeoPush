import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

import {
  GEOFENCE_TARGETS_KEY,
  GEOFENCING_TASK_NAME,
} from "@/tasks/geofencingTask";
import { Reminder } from "@/types/reminder";

type GeofenceTarget = {
  title: string;
  placeName: string;
};

const requestBackgroundPermissions = async (): Promise<void> => {
  const foreground = await Location.getForegroundPermissionsAsync();
  const foregroundPermission =
    foreground.status === "granted"
      ? foreground
      : await Location.requestForegroundPermissionsAsync();
  if (foregroundPermission.status !== "granted") {
    throw new Error(
      "La permission de localisation au premier plan est requise.",
    );
  }

  const background = await Location.getBackgroundPermissionsAsync();
  const backgroundPermission =
    background.status === "granted"
      ? background
      : await Location.requestBackgroundPermissionsAsync();
  if (backgroundPermission.status !== "granted") {
    throw new Error(
      "Autorisez la localisation « Toujours » pour GeoPush dans Réglages > Confidentialité et sécurité > Service de localisation > GeoPush.",
    );
  }
};

const requestNotificationPermissions = async (): Promise<void> => {
  const current = await Notifications.getPermissionsAsync();
  const permissions =
    current.status === "granted"
      ? current
      : await Notifications.requestPermissionsAsync();

  if (permissions.status !== "granted") {
    throw new Error("La permission d'envoyer des notifications est requise.");
  }

  await Notifications.setNotificationChannelAsync("geopush-reminders", {
    name: "Rappels GeoPush",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

export const syncGeofences = async (reminders: Reminder[]): Promise<void> => {
  const activeReminders = reminders.filter(
    (reminder) => reminder.status === "active" && reminder.places.length > 0,
  );
  const regions: Location.LocationRegion[] = [];
  const targets: Record<string, GeofenceTarget> = {};

  for (const reminder of activeReminders) {
    for (const place of reminder.places) {
      const identifier = `${reminder.id}:${place.id}`;
      regions.push({
        identifier,
        latitude: place.latitude,
        longitude: place.longitude,
        radius: reminder.radius,
        notifyOnEnter: true,
        notifyOnExit: false,
      });
      targets[identifier] = {
        title: reminder.title,
        placeName: place.name,
      };
    }
  }

  if (regions.length === 0) {
    if (await Location.hasStartedGeofencingAsync(GEOFENCING_TASK_NAME)) {
      await Location.stopGeofencingAsync(GEOFENCING_TASK_NAME);
    }
    await AsyncStorage.removeItem(GEOFENCE_TARGETS_KEY);
    return;
  }

  await requestBackgroundPermissions();
  await requestNotificationPermissions();
  await AsyncStorage.setItem(GEOFENCE_TARGETS_KEY, JSON.stringify(targets));
  await Location.startGeofencingAsync(GEOFENCING_TASK_NAME, regions);
};
