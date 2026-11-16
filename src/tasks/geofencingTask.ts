import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

export const GEOFENCING_TASK_NAME = "geopush-geofencing";
export const GEOFENCE_TARGETS_KEY = "@geopush/geofence-targets";

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

    await Notifications.scheduleNotificationAsync({
      content: {
        title: target.title,
        body: `Vous êtes près de ${target.placeName}.`,
        data: { reminderId: regionIdentifier },
      },
      trigger: null,
    });
  },
);
