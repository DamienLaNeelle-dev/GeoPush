import * as Location from "expo-location";

export const LOCATION_PERMISSION_DENIED = "LOCATION_PERMISSION_DENIED";

export interface Coords {
  latitude: number;
  longitude: number;
}

// Demande l'autorisation (si besoin) puis renvoie la position GPS actuelle.
export const getCurrentCoords = async (): Promise<Coords> => {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") {
    throw new Error(LOCATION_PERMISSION_DENIED);
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
};
