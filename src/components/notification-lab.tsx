// src/components/notification-lab.tsx
import * as Notifications from "expo-notifications";
import { Alert, Button, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { scheduleTestNotification } from "@/notifications";

async function notifyIn(seconds: number) {
  try {
    await scheduleTestNotification(seconds);
  } catch (error) {
    console.error("Impossible de programmer la notification de test.", error);
    Alert.alert(
      "Notification impossible",
      error instanceof Error
        ? error.message
        : "Une erreur inconnue est survenue.",
    );
  }
}

export function NotificationLab() {
  return (
    <SafeAreaView style={styles.container}>
      <Button title="Notifier dans 5 s" onPress={() => notifyIn(5)} />
      <Button title="Notifier dans 15 s" onPress={() => notifyIn(15)} />
      <Button
        title="Annuler les notifications programmées"
        onPress={() => Notifications.cancelAllScheduledNotificationsAsync()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
});
