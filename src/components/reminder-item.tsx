import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import {
  formatRadius,
  getCategoryEmoji,
  getCategoryLabels,
} from "@/constants/categories";
import { colors, radius, shadow } from "@/constants/ui";
import { Reminder } from "@/types/reminder";

interface Props {
  reminder: Reminder;
  onToggleDone: () => void;
  onPress: () => void;
  onDelete: () => void;
}

export function ReminderItem({ reminder, onToggleDone, onPress, onDelete }: Props) {
  const isDone = reminder.status === "done";
  const chosen = reminder.places.length;
  const where =
    chosen > 0
      ? `${chosen} commerce${chosen > 1 ? "s" : ""} choisi${chosen > 1 ? "s" : ""}`
      : "Tous les commerces proches";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Icône de la première catégorie */}
      <View style={[styles.badge, isDone && styles.badgeDone]}>
        <Text style={styles.badgeEmoji}>
          {getCategoryEmoji(reminder.categories[0] ?? null)}
        </Text>
      </View>

      <View style={styles.body}>
        <Text
          style={[styles.title, isDone && styles.titleDone]}
          numberOfLines={1}
        >
          {reminder.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {getCategoryLabels(reminder.categories) || "Commerces"} · {where}
        </Text>
        <View style={styles.meta}>
          <View style={styles.pill}>
            <Icon name="radius" size={12} color={colors.primary} />
            <Text style={styles.pillText}>{formatRadius(reminder.radius)}</Text>
          </View>
          <Pressable onPress={onDelete} hitSlop={10} style={styles.delete}>
            <Icon name="trash" size={14} color={colors.textSubtle} />
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={onToggleDone}
        hitSlop={12}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isDone }}
        style={[styles.checkbox, isDone && styles.checkboxDone]}
      >
        {isDone && <Icon name="check" size={16} color={colors.onPrimary} />}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    marginBottom: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow(1),
  },
  cardPressed: { transform: [{ scale: 0.98 }] },
  badge: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeDone: { backgroundColor: colors.surfaceMuted, opacity: 0.6 },
  badgeEmoji: { fontSize: 24 },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  titleDone: { textDecorationLine: "line-through", color: colors.textSubtle },
  subtitle: { fontSize: 13, color: colors.textMuted },
  meta: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  pillText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  delete: { padding: 2 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxDone: { backgroundColor: colors.success, borderColor: colors.success },
});
