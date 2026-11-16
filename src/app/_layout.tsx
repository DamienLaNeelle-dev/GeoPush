import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ReminderDraftProvider } from "@/context/ReminderDraftContext";
import { useReminders } from "@/hooks/use-reminders";
import { syncGeofences } from "@/services/location/geofencingService";
import "@/tasks/geofencingTask";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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

function GeofencingSync() {
  const { reminders } = useReminders();

  useEffect(() => {
    syncGeofences(reminders).catch((error: unknown) => {
      console.error("Impossible de synchroniser les zones GeoPush", error);
    });
  }, [reminders]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ReminderDraftProvider>
        <GeofencingSync />
        <RootNavigator />
      </ReminderDraftProvider>
    </AuthProvider>
  );
}
