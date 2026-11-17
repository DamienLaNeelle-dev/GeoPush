// src/hooks/use-notification-permission.ts
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";

import { ensureNotificationChannels } from "@/notifications";

export function useNotificationPermission() {
  const [permission, setPermission] =
    useState<Notifications.NotificationPermissionsStatus | null>(null);

  const refresh = useCallback(async () => {
    const status = await Notifications.getPermissionsAsync();
    if (status.status === "granted") {
      await ensureNotificationChannels();
    }
    setPermission(status);
    return status;
  }, []);

  const request = useCallback(async () => {
    const status = await Notifications.requestPermissionsAsync();
    if (status.status === "granted") {
      await ensureNotificationChannels();
    }
    setPermission(status);
    return status;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return [permission, request, refresh] as const;
}
