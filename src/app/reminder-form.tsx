import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  CATEGORIES,
  CategoryKey,
  RADIUS_OPTIONS,
  formatRadius,
} from "@/constants/categories";
import { useAuth } from "@/context/AuthContext";
import { useReminders } from "@/hooks/use-reminders";
import { createReminder, updateReminder } from "@/services/reminders/reminderService";
import { ReminderMode } from "@/types/reminder";

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ReminderFormScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { reminders } = useReminders();

  const isEdit = !!id;

  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<ReminderMode>("favorite");
  const [placeName, setPlaceName] = useState("");
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [radius, setRadius] = useState<number>(500);

  // En modification : on pré-remplit le formulaire une seule fois.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!isEdit || prefilled.current) return;
    const existing = reminders.find((r) => r.id === id);
    if (!existing) return;

    setTitle(existing.title);
    setMode(existing.mode);
    setPlaceName(existing.placeName ?? "");
    setCategory(existing.category);
    setRadius(existing.radius);
    prefilled.current = true;
  }, [isEdit, id, reminders]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Erreur", "Donnez un titre à votre rappel.");
      return;
    }
    if (mode === "favorite" && !placeName.trim()) {
      Alert.alert("Erreur", "Indiquez le nom de votre commerce favori.");
      return;
    }
    if (mode === "nearby" && !category) {
      Alert.alert("Erreur", "Choisissez une catégorie de commerce.");
      return;
    }

    const input = {
      title: title.trim(),
      mode,
      placeName: mode === "favorite" ? placeName.trim() : null,
      latitude: null, // sera renseigné quand on ajoutera le choix du lieu sur carte
      longitude: null,
      category: mode === "nearby" ? category : null,
      radius,
    };

    // On ne bloque pas l'écran en attendant le serveur : la liste se met à jour
    // tout de suite, et une erreur éventuelle est affichée si elle arrive.
    const request =
      isEdit && id ? updateReminder(user.uid, id, input) : createReminder(user.uid, input);

    request.catch((e) => Alert.alert("Enregistrement impossible", e.message));
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.screenTitle}>
          {isEdit ? "Modifier le rappel" : "Nouveau rappel"}
        </Text>

        <Text style={styles.label}>Titre</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex : Acheter du pain"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Mode de localisation</Text>
        <View style={styles.row}>
          <Chip
            label="Commerce favori"
            selected={mode === "favorite"}
            onPress={() => setMode("favorite")}
          />
          <Chip
            label="À proximité"
            selected={mode === "nearby"}
            onPress={() => setMode("nearby")}
          />
        </View>

        {mode === "favorite" ? (
          <>
            <Text style={styles.label}>Nom du commerce</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex : Boulangerie Dupont"
              value={placeName}
              onChangeText={setPlaceName}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Catégorie de commerce</Text>
            <View style={styles.row}>
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.key}
                  label={c.label}
                  selected={category === c.key}
                  onPress={() => setCategory(c.key)}
                />
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Rayon de déclenchement</Text>
        <View style={styles.row}>
          {RADIUS_OPTIONS.map((r) => (
            <Chip
              key={r}
              label={formatRadius(r)}
              selected={radius === r}
              onPress={() => setRadius(r)}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Enregistrer</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>Annuler</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25, paddingTop: 30 },
  screenTitle: { fontSize: 26, fontWeight: "bold", marginBottom: 25 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 10 },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDDDDD",
  },
  chipSelected: { backgroundColor: "#5B4BDB", borderColor: "#5B4BDB" },
  chipText: { color: "#333333" },
  chipTextSelected: { color: "#FFFFFF", fontWeight: "600" },
  button: {
    height: 55,
    backgroundColor: "#5B4BDB",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  cancel: { color: "#5B4BDB", textAlign: "center", marginTop: 20 },
});
