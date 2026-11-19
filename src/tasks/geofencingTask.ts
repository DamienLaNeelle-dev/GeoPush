import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { scheduleGeofenceNotification } from "@/notifications";
import { GeofenceTarget } from "@/types/geofence";
import {
  evaluateGeofenceEvent,
  GEOFENCE_INSIDE_KEY,
  GEOFENCE_LAST_NOTIFIED_KEY,
  GeofenceEvent,
  InsideRegions,
  LastNotifiedRegions,
} from "@/utils/geofence-entry";

export const GEOFENCING_TASK_NAME = "geopush-geofencing";
export const GEOFENCE_TARGETS_KEY = "@geopush/geofence-targets";

const readJson = async <T>(key: string): Promise<T> => {
  const json = await AsyncStorage.getItem(key);
  return json ? (JSON.parse(json) as T) : ({} as T);
};

// Traduit l'événement expo en événement de la logique pure (null = ignoré)
const toGeofenceEvent = (
  eventType: Location.GeofencingEventType,
): GeofenceEvent | null => {
  if (eventType === Location.GeofencingEventType.Enter) return "enter";
  if (eventType === Location.GeofencingEventType.Exit) return "exit";
  return null;
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

    const event = toGeofenceEvent(data.eventType);
    if (!event) return;

    // Toute la décision (déjà dans la zone ? délai de 15 min ?) est dans
    // utils/geofence-entry.ts ; ici on ne fait que lire/écrire l'état.
    const decision = evaluateGeofenceEvent({
      event,
      regionId: regionIdentifier,
      inside: await readJson<InsideRegions>(GEOFENCE_INSIDE_KEY),
      lastNotified: await readJson<LastNotifiedRegions>(
        GEOFENCE_LAST_NOTIFIED_KEY,
      ),
      now: Date.now(),
    });

    if (decision.action === "ignored-already-inside") {
      console.log(
        `Notification ignorée pour ${regionIdentifier}: déjà dans la zone.`,
      );
      return;
    }

    await AsyncStorage.setItem(
      GEOFENCE_INSIDE_KEY,
      JSON.stringify(decision.inside),
    );

    if (decision.action === "exited") return;

    if (decision.action === "ignored-cooldown") {
      console.log(
        `Notification ignorée pour ${regionIdentifier}: délai anti-doublon actif.`,
      );
      return;
    }

    const targets = await readJson<Record<string, GeofenceTarget>>(
      GEOFENCE_TARGETS_KEY,
    );
    const target = targets[regionIdentifier];

    if (!target) {
      console.error(`Aucun rappel trouvé pour la région ${regionIdentifier}`);
      return;
    }

    await AsyncStorage.setItem(
      GEOFENCE_LAST_NOTIFIED_KEY,
      JSON.stringify(decision.lastNotified),
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
