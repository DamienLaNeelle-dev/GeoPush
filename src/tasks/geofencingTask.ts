import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { scheduleGeofenceNotification } from "@/notifications";
import { GeofenceTarget } from "@/types/geofence";

export const GEOFENCING_TASK_NAME = "geopush-geofencing";
export const GEOFENCE_TARGETS_KEY = "@geopush/geofence-targets";
export const GEOFENCE_LAST_NOTIFIED_KEY = "@geopush/geofence-last-notified";
// Zones dans lesquelles l'utilisateur se trouve déjà (déjà notifié)
export const GEOFENCE_INSIDE_KEY = "@geopush/geofence-inside";

const readInsideRegions = async (): Promise<Record<string, true>> => {
  const json = await AsyncStorage.getItem(GEOFENCE_INSIDE_KEY);
  return json ? (JSON.parse(json) as Record<string, true>) : {};
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

    if (!data) return;

    const regionIdentifier = data.region.identifier;
    if (!regionIdentifier) {
      console.error("La région de geofencing reçue n'a pas d'identifiant.");
      return;
    }

    const inside = await readInsideRegions();

    if (data.eventType === Location.GeofencingEventType.Exit) {
      // Sortie de zone : la prochaine entrée pourra de nouveau notifier
      delete inside[regionIdentifier];
      await AsyncStorage.setItem(GEOFENCE_INSIDE_KEY, JSON.stringify(inside));
      return;
    }

    if (data.eventType !== Location.GeofencingEventType.Enter) return;

    // L'OS renvoie un « Enter » à chaque (ré)enregistrement des zones, donc
    // à chaque ouverture de l'appli si on est déjà dedans : on l'ignore.
    if (inside[regionIdentifier]) {
      console.log(
        `Notification ignorée pour ${regionIdentifier}: déjà dans la zone.`,
      );
      return;
    }
    inside[regionIdentifier] = true;
    await AsyncStorage.setItem(GEOFENCE_INSIDE_KEY, JSON.stringify(inside));

    const targetsJson = await AsyncStorage.getItem(GEOFENCE_TARGETS_KEY);
    const targets = targetsJson
      ? (JSON.parse(targetsJson) as Record<string, GeofenceTarget>)
      : {};
    const target = targets[regionIdentifier];

    if (!target) {
      console.error(`Aucun rappel trouvé pour la région ${regionIdentifier}`);
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
      target.latitude,
      target.longitude,
    );
  },
);
