// src/app/notifications.tsx
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PermissionGate } from "@/components/labo/PermissionGate";
import { NotificationLab } from "@/components/notification-lab";
import { Icon } from "@/components/ui/icon";
import { colors, font, shadow, spacing } from "@/constants/ui";
import { useNotificationPermission } from "@/hooks/use-notification-permission";

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, request, refresh] = useNotificationPermission();

  return (
    <PermissionGate
      title="Notifications"
      message="Les notifications préviennent des lieux qui vous intéressent."
      permission={permission}
      request={request}
      refresh={refresh}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.lg + 4,
        }}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.back}
            hitSlop={6}
            accessibilityLabel="Retour"
          >
            <Icon name="back" size={16} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              Vérifiez que les rappels s&apos;affichent bien sur cet appareil.
            </Text>
          </View>
        </View>
        <NotificationLab />
      </ScrollView>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: spacing.lg,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    ...shadow(1),
  },
  title: { ...font.title, fontSize: 26, color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
});
