import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { formatRadius, getCategoryLabels } from "@/constants/categories";
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
  const place =
    `🔎 ${getCategoryLabels(reminder.categories) || "Commerces"} à proximité` +
    (chosen > 0 ? ` (${chosen} choisi${chosen > 1 ? "s" : ""})` : "");

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={[styles.checkbox, isDone && styles.checkboxDone]}
        onPress={onToggleDone}
      >
        {isDone && <Text style={styles.check}>✓</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.body} onPress={onPress}>
        <Text style={[styles.title, isDone && styles.titleDone]}>
          {reminder.title}
        </Text>
        <Text style={styles.subtitle}>
          {place} · {formatRadius(reminder.radius)}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onDelete} hitSlop={10}>
        <Text style={styles.delete}>Supprimer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#5B4BDB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  checkboxDone: { backgroundColor: "#5B4BDB" },
  check: { color: "#FFFFFF", fontWeight: "bold" },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: "600" },
  titleDone: { textDecorationLine: "line-through", color: "#999999" },
  subtitle: { fontSize: 13, color: "#777777", marginTop: 4 },
  delete: { color: "#D64545", fontSize: 13, marginLeft: 10 },
});
