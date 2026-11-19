import { Pressable, StyleSheet, Text } from "react-native";

import { colors, radius } from "@/constants/ui";

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  emoji?: string;
}

// Petite pastille sélectionnable (catégories, rayons, commerces choisis…).
export function Chip({ label, selected, onPress, emoji }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && !selected && styles.chipPressed,
      ]}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>
        {emoji ? `${emoji}  ${label}` : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipPressed: { backgroundColor: colors.surfaceMuted },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { fontSize: 14, fontWeight: "500", color: colors.text },
  textSelected: { color: colors.onPrimary, fontWeight: "700" },
});
