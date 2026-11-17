import { Stack } from "expo-router";
import { AppState, ActivityIndicator, View } from "react-native";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ReminderDraftProvider } from "@/context/ReminderDraftContext";
import { useNotificationRedirect } from "@/hooks/use-notification-redirect";
import { useReminders } from "@/hooks/use-reminders";
import { syncGeofences } from "@/services/location/geofencingService";
import "@/notifications";
import "@/tasks/geofencingTask";

function GeofencingSync() {
  const { reminders, loading, error } = useReminders();

  useEffect(() => {
    if (loading || error) return;

    const synchronize = () => {
      syncGeofences(reminders).catch((syncError) => {
        console.error("Impossible de synchroniser les zones GeoPush.", syncError);
      });
    };

    synchronize();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") synchronize();
    });

    return () => subscription.remove();
  }, [error, loading, reminders]);

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
        <GeofencingSync />
        <RootNavigator />
      </ReminderDraftProvider>
    </AuthProvider>
  );
}
