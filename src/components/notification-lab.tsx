// src/components/notification-lab.tsx
import * as Notifications from "expo-notifications";
import { Button, StyleSheet, View } from "react-native";

async function notifyIn(seconds: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Un lieu vous attend",
      body: "Touchez pour ouvrir la fiche du lieu n°42",
      data: { url: "/lieu/42" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: "default",
    },
  });
}

export function NotificationLab() {
  return (
    <View style={styles.container}>
      <Button title="Notifier dans 5 s" onPress={() => notifyIn(5)} />
      <Button title="Notifier dans 15 s" onPress={() => notifyIn(15)} />
      <Button
        title="Annuler les notifications programmées"
        onPress={() => Notifications.cancelAllScheduledNotificationsAsync()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
});
