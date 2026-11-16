import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
}

// Petite pastille sélectionnable (catégories, rayons, commerces choisis…).
export function Chip({ label, selected, onPress }: Props) {
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    backgroundColor: "#FFFFFF",
  },
  chipSelected: { backgroundColor: "#5B4BDB", borderColor: "#5B4BDB" },
  text: { color: "#333333" },
  textSelected: { color: "#FFFFFF", fontWeight: "600" },
});
