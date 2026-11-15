import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { getCategoryLabel } from "@/constants/categories";
import { Place } from "@/types/place";
import { formatDistance } from "@/utils/geo";

interface Props {
  places: Place[];
  onSelect?: (place: Place) => void; // absent = liste en lecture seule
  selectedIds?: string[]; // commerces déjà choisis (coche affichée)
}

export function PlaceList({ places, onSelect, selectedIds = [] }: Props) {
  return (
    <View>
      {places.map((place) => {
        const selected = selectedIds.includes(place.id);
        return (
        <TouchableOpacity
          key={place.id}
          style={[styles.row, selected && styles.rowSelected]}
          disabled={!onSelect}
          onPress={() => onSelect?.(place)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{place.name}</Text>
            <Text style={styles.sub}>{getCategoryLabel(place.category)}</Text>
          </View>
          <Text style={styles.distance}>{formatDistance(place.distance)}</Text>
          {selected && <Text style={styles.check}>✓</Text>}
        </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 10,
    marginBottom: 8,
  },
  rowSelected: { borderColor: "#5B4BDB", backgroundColor: "#F2F0FF" },
  check: { color: "#5B4BDB", fontWeight: "bold", fontSize: 18, marginLeft: 10 },
  name: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 13, color: "#777777", marginTop: 2 },
  distance: { color: "#5B4BDB", fontWeight: "600", marginLeft: 10 },
});
