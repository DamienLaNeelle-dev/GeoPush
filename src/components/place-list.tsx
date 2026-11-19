import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { getCategoryEmoji, getCategoryLabel } from "@/constants/categories";
import { colors, radius } from "@/constants/ui";
import { Place } from "@/types/place";
import { formatDistance } from "@/utils/geo";

interface Props {
  places: Place[];
  onSelect?: (place: Place) => void; // absent = liste en lecture seule
  selectedIds?: string[]; // commerces déjà choisis (coche affichée)
}

export function PlaceList({ places, onSelect, selectedIds = [] }: Props) {
  return (
    <View style={styles.list}>
      {places.map((place) => {
        const selected = selectedIds.includes(place.id);
        return (
          <Pressable
            key={place.id}
            style={({ pressed }) => [
              styles.row,
              selected && styles.rowSelected,
              pressed && styles.rowPressed,
            ]}
            disabled={!onSelect}
            onPress={() => onSelect?.(place)}
          >
            <View style={[styles.emoji, selected && styles.emojiSelected]}>
              <Text style={{ fontSize: 18 }}>
                {getCategoryEmoji(place.category)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {place.name}
              </Text>
              <Text style={styles.sub}>
                {getCategoryLabel(place.category)} ·{" "}
                {formatDistance(place.distance)}
              </Text>
            </View>
            <View style={[styles.check, selected && styles.checkSelected]}>
              {selected && <Icon name="check" size={14} color={colors.onPrimary} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rowPressed: { opacity: 0.8 },
  emoji: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiSelected: { backgroundColor: colors.surface },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
