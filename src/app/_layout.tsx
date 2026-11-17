import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ReminderDraftProvider } from "@/context/ReminderDraftContext";
import "@/notifications";
import "@/tasks/geofencingTask";

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
  return (
    <AuthProvider>
      <ReminderDraftProvider>
        <RootNavigator />
      </ReminderDraftProvider>
    </AuthProvider>
  );
}
