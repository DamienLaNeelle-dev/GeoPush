// src/components/notification-lab.tsx
import * as Notifications from "expo-notifications";
import { Alert, Button, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useReminders } from "@/hooks/use-reminders";
import { scheduleTestNotification } from "@/notifications";
import { Reminder } from "@/types/reminder";

async function notifyIn(seconds: number, reminder: Reminder | undefined) {
  const place = reminder?.places[0];
  if (!reminder || !place) {
    Alert.alert(
      "Aucun rappel",
      "Créez un rappel actif avec au moins un lieu pour tester la notification.",
    );
    return;
  }

  try {
    await scheduleTestNotification(
      seconds,
      reminder.title,
      place.name,
      reminder.id,
      place.id,
    );
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
  const { active } = useReminders();
  // Premier rappel actif qui possède un lieu précis
  const reminder = active.find((r) => r.places.length > 0);

  return (
    <SafeAreaView style={styles.container}>
      <Text>
        {reminder
          ? `Test avec « ${reminder.title} » – ${reminder.places[0].name}`
          : "Aucun rappel actif avec un lieu."}
      </Text>
      <Button title="Notifier dans 5 s" onPress={() => notifyIn(5, reminder)} />
      <Button
        title="Notifier dans 15 s"
        onPress={() => notifyIn(15, reminder)}
      />
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
