import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

import { ensureNotificationChannels } from "@/notifications";

// Les trois permissions dont GeoPush a besoin pour fonctionner.
export type PermissionKey = "location" | "background" | "notifications";

export type PermissionState = {
  granted: boolean;
  // false = l'OS n'affichera plus la demande : seuls les réglages peuvent la rétablir
  canAskAgain: boolean;
};

export type AppPermissions = Record<PermissionKey, PermissionState>;

export const PERMISSION_ORDER: PermissionKey[] = [
  "location",
  "background",
  "notifications",
];

const toState = (p: { granted: boolean; canAskAgain: boolean }) => ({
  granted: p.granted,
  canAskAgain: p.canAskAgain,
});

// Lit l'état actuel, sans rien demander à l'utilisateur.
export const getAppPermissions = async (): Promise<AppPermissions> => {
  const [location, background, notifications] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
    Notifications.getPermissionsAsync(),
  ]);
  return {
    location: toState(location),
    background: toState(background),
    notifications: toState(notifications),
  };
};

export const allGranted = (permissions: AppPermissions): boolean =>
  PERMISSION_ORDER.every((key) => permissions[key].granted);

const request: Record<PermissionKey, () => Promise<PermissionState>> = {
  location: async () => toState(await Location.requestForegroundPermissionsAsync()),
  // Ne peut être demandée qu'une fois la position « pendant l'utilisation » accordée
  background: async () => toState(await Location.requestBackgroundPermissionsAsync()),
  notifications: async () => {
    // Android 13+ : la demande ne s'affiche que si un canal existe déjà
    await ensureNotificationChannels();
    return toState(await Notifications.requestPermissionsAsync());
  },
};

// Demande, dans l'ordre, chaque permission manquante que l'OS accepte encore
// d'afficher. Celles déjà accordées ne sont jamais redemandées.
export const requestMissingPermissions = async (): Promise<AppPermissions> => {
  const permissions = await getAppPermissions();

  for (const key of PERMISSION_ORDER) {
    const current = permissions[key];
    if (current.granted || !current.canAskAgain) continue;
    // Sans la position au premier plan, l'OS refuse celle en arrière-plan
    if (key === "background" && !permissions.location.granted) continue;
    permissions[key] = await request[key]();
  }

  if (permissions.notifications.granted) await ensureNotificationChannels();
  return permissions;
};
