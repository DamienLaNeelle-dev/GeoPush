// src/components/notification-lab.tsx
import * as Notifications from "expo-notifications";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { getCategoryEmoji } from "@/constants/categories";
import { colors, font, radius, shadow, spacing } from "@/constants/ui";
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
  const place = reminder?.places[0];

  return (
    <View style={styles.container}>
      {/* Aperçu de la notification qui sera envoyée */}
      <Text style={styles.overline}>Aperçu</Text>
      <View style={styles.preview}>
        <View style={styles.appIcon}>
          <Text style={{ fontSize: 18 }}>
            {place ? getCategoryEmoji(place.category) : "📍"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.previewHeader}>
            <Text style={styles.appName}>GEOPUSH</Text>
            <Text style={styles.time}>maintenant</Text>
          </View>
          <Text style={styles.previewTitle} numberOfLines={1}>
            {reminder ? reminder.title : "Aucun rappel actif avec un lieu"}
          </Text>
          <Text style={styles.previewBody} numberOfLines={2}>
            {place
              ? `Vous êtes près de ${place.name}.`
              : "Créez un rappel et choisissez au moins un commerce pour tester."}
          </Text>
        </View>
      </View>

      <Text style={styles.overline}>Envoyer un test</Text>
      <View style={styles.row}>
        <Button
          title="Dans 5 s"
          icon="bell"
          onPress={() => notifyIn(5, reminder)}
          disabled={!reminder}
          style={{ flex: 1 }}
        />
        <Button
          title="Dans 15 s"
          icon="bell"
          variant="secondary"
          onPress={() => notifyIn(15, reminder)}
          disabled={!reminder}
          style={{ flex: 1 }}
        />
      </View>
      <Button
        title="Annuler les notifications programmées"
        variant="ghost"
        onPress={() => Notifications.cancelAllScheduledNotificationsAsync()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  overline: { ...font.overline, color: colors.textSubtle, marginTop: spacing.sm },
  preview: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow(2),
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
  },
  previewHeader: { flexDirection: "row", justifyContent: "space-between" },
  appName: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  time: { fontSize: 12, color: colors.textSubtle },
  previewTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 2 },
  previewBody: { fontSize: 14, color: colors.textMuted, marginTop: 1 },
  row: { flexDirection: "row", gap: spacing.md },
});
