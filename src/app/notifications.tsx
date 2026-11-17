// src/app/notifications.tsx
import { ScrollView } from "react-native";

import { PermissionGate } from "@/components/labo/PermissionGate";
import { NotificationLab } from "@/components/notification-lab";
import { useNotificationPermission } from "@/hooks/use-notification-permission";

export default function NotificationsScreen() {
  const [permission, request, refresh] = useNotificationPermission();

  return (
    <PermissionGate
      title="Notifications"
      message="Les notifications préviennent des lieux qui vous intéressent."
      permission={permission}
      request={request}
      refresh={refresh}
    >
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
        <NotificationLab />
      </ScrollView>
    </PermissionGate>
  );
}
