// src/hooks/use-notification-permission.ts
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";

// Même forme que les hooks d'Expo : [permission, request, refresh]
export function useNotificationPermission() {
  const [permission, setPermission] =
    useState<Notifications.NotificationPermissionsStatus | null>(null);

  const refresh = useCallback(async () => {
    const status = await Notifications.getPermissionsAsync();
    setPermission(status);
    return status;
  }, []);

  const request = useCallback(async () => {
    const status = await Notifications.requestPermissionsAsync();
    setPermission(status);
    return status;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return [permission, request, refresh] as const;
}
