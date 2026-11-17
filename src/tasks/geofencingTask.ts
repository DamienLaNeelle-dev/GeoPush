import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { scheduleGeofenceNotification } from "@/notifications";

export const GEOFENCING_TASK_NAME = "geopush-geofencing";
export const GEOFENCE_TARGETS_KEY = "@geopush/geofence-targets";
export const GEOFENCE_LAST_NOTIFIED_KEY = "@geopush/geofence-last-notified";

type GeofenceTarget = {
  title: string;
  placeName: string;
};

type GeofencingTaskData = {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
};

TaskManager.defineTask<GeofencingTaskData>(
  GEOFENCING_TASK_NAME,
  async ({ data, error }) => {
    if (error) {
      console.error("Erreur du geofencing GeoPush", error);
      return;
    }

    if (!data || data.eventType !== Location.GeofencingEventType.Enter) {
      return;
    }

    const regionIdentifier = data.region.identifier;
    if (!regionIdentifier) {
      console.error("La région de geofencing reçue n'a pas d'identifiant.");
      return;
    }

    const targetsJson = await AsyncStorage.getItem(GEOFENCE_TARGETS_KEY);
    const targets = targetsJson
      ? (JSON.parse(targetsJson) as Record<string, GeofenceTarget>)
      : {};
    const target = targets[regionIdentifier];

    if (!target) {
      console.error(
        `Aucun rappel trouvé pour la région ${regionIdentifier}`,
      );
      return;
    }

    const lastNotifiedJson = await AsyncStorage.getItem(
      GEOFENCE_LAST_NOTIFIED_KEY,
    );
    const lastNotified = lastNotifiedJson
      ? (JSON.parse(lastNotifiedJson) as Record<string, number>)
      : {};
    const now = Date.now();
    const cooldown = 15 * 60 * 1000;

    if (now - (lastNotified[regionIdentifier] ?? 0) < cooldown) {
      console.log(
        `Notification ignorée pour ${regionIdentifier}: délai anti-doublon actif.`,
      );
      return;
    }

    lastNotified[regionIdentifier] = now;
    await AsyncStorage.setItem(
      GEOFENCE_LAST_NOTIFIED_KEY,
      JSON.stringify(lastNotified),
    );

    await scheduleGeofenceNotification(
      target.title,
      target.placeName,
      regionIdentifier,
    );
  },
);
