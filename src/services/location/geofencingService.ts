import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

import { requestNotificationPermission } from "@/notifications";
import {
  GEOFENCE_TARGETS_KEY,
  GEOFENCING_TASK_NAME,
} from "@/tasks/geofencingTask";
import { GeofenceTarget } from "@/types/geofence";
import { Reminder } from "@/types/reminder";

type IdentifiedRegion = Location.LocationRegion & {
  identifier: string;
};

let synchronization: Promise<void> | null = null;

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

export const syncGeofences = async (reminders: Reminder[]): Promise<void> => {
  if (synchronization) return synchronization;

  synchronization = synchronizeGeofences(reminders).finally(() => {
    synchronization = null;
  });
  return synchronization;
};

const synchronizeGeofences = async (reminders: Reminder[]): Promise<void> => {
  const activeReminders = reminders.filter(
    (reminder) => reminder.status === "active" && reminder.places.length > 0,
  );
  const regions: IdentifiedRegion[] = [];
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
        latitude: place.latitude,
        longitude: place.longitude,
      };
    }
  }

  if (regions.length === 0) {
    if (await Location.hasStartedGeofencingAsync(GEOFENCING_TASK_NAME)) {
      await Location.stopGeofencingAsync(GEOFENCING_TASK_NAME);
    }
    await AsyncStorage.removeItem(GEOFENCE_TARGETS_KEY);
    await AsyncStorage.removeItem(GEOFENCE_REGIONS_KEY);
    return;
  }

  await requestBackgroundPermissions();
  await requestNotificationPermission();
  await AsyncStorage.setItem(GEOFENCE_TARGETS_KEY, JSON.stringify(targets));

  const regionSignature = JSON.stringify(
    regions
      .map(({ identifier, latitude, longitude, radius }) => ({
        identifier,
        latitude,
        longitude,
        radius,
      }))
      .sort((a, b) => a.identifier.localeCompare(b.identifier)),
  );
  const currentSignature = await AsyncStorage.getItem(GEOFENCE_REGIONS_KEY);
  const isStarted =
    await Location.hasStartedGeofencingAsync(GEOFENCING_TASK_NAME);

  if (isStarted && currentSignature === regionSignature) {
    return;
  }

  if (isStarted) {
    await Location.stopGeofencingAsync(GEOFENCING_TASK_NAME);
  }

  await Location.startGeofencingAsync(GEOFENCING_TASK_NAME, regions);
  await AsyncStorage.setItem(GEOFENCE_REGIONS_KEY, regionSignature);
};

const GEOFENCE_REGIONS_KEY = "@geopush/geofence-regions";
