import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, AppState, View } from "react-native";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ReminderDraftProvider } from "@/context/ReminderDraftContext";
import { PermissionsGate } from "@/components/permissions-gate";
import { useNotificationRedirect } from "@/hooks/use-notification-redirect";
import { useReminders } from "@/hooks/use-reminders";
import "@/notifications";
import { syncGeofences } from "@/services/location/geofencingService";
import "@/tasks/geofencingTask";

function GeofencingSync() {
  const { user, loading: authLoading } = useAuth();
  const { reminders, loading, error } = useReminders();

  useEffect(() => {
    if (authLoading || !user || loading || error) return;

    const synchronize = () => {
      syncGeofences(reminders).catch((syncError) => {
        console.error(
          "Impossible de synchroniser les zones GeoPush.",
          syncError,
        );
      });
    };

    synchronize();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") synchronize();
    });

    return () => subscription.remove();
  }, [authLoading, error, loading, reminders, user]);

  return null;
}

function RootNavigator() {
  const { loading } = useAuth();

  // Attendre que Firebase vérifie la session
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="reminder-form" options={{ presentation: "modal" }} />
      <Stack.Screen
        name="place-map"
        options={{ presentation: "fullScreenModal" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useNotificationRedirect();
  return (
    <AuthProvider>
      <ReminderDraftProvider>
        {/* Rien ne démarre tant que les permissions ne sont pas accordées */}
        <PermissionsGate>
          <GeofencingSync />
          <RootNavigator />
        </PermissionsGate>
      </ReminderDraftProvider>
    </AuthProvider>
  );
}
