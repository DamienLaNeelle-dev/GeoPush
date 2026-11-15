import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

import { PlaceList } from "@/components/place-list";
import {
  CATEGORIES,
  CategoryKey,
  MAX_PLACES,
  RADIUS_OPTIONS,
  formatRadius,
} from "@/constants/categories";
import { useAuth } from "@/context/AuthContext";
import { usePlaceSearch } from "@/hooks/use-place-search";
import { useReminders } from "@/hooks/use-reminders";
import { createReminder, updateReminder } from "@/services/reminders/reminderService";
import { Place, SavedPlace } from "@/types/place";
import { ReminderInput } from "@/types/reminder";

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
  const { places, loading: searching, error: searchError, searched, search, reset } =
    usePlaceSearch();

  const isEdit = !!id;

  const [title, setTitle] = useState("");
  const [categories, setCategories] = useState<CategoryKey[]>([]);
  const [chosenPlaces, setChosenPlaces] = useState<SavedPlace[]>([]); // commerces cochés
  const [radius, setRadius] = useState<number>(500);

  // En modification : on pré-remplit le formulaire une seule fois.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!isEdit || prefilled.current) return;
    const existing = reminders.find((r) => r.id === id);
    if (!existing) return;

    setTitle(existing.title);
    setCategories(existing.categories);
    setChosenPlaces(existing.places);
    setRadius(existing.radius);
    prefilled.current = true;
  }, [isEdit, id, reminders]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  const toggleCategory = (key: CategoryKey) => {
    const removing = categories.includes(key);
    setCategories(removing ? categories.filter((k) => k !== key) : [...categories, key]);
    // Si on décoche une catégorie, on retire aussi les commerces choisis de cette catégorie.
    if (removing) setChosenPlaces((prev) => prev.filter((p) => p.category !== key));
    reset(); // les anciens résultats ne correspondent plus
  };

  const handleSearch = () => {
    if (categories.length === 0) {
      Alert.alert("Erreur", "Choisissez au moins une catégorie de commerce.");
      return;
    }
    search(categories);
  };

  // Coche / décoche un commerce dans la liste.
  const handleTogglePlace = (place: Place) => {
    if (chosenPlaces.some((p) => p.id === place.id)) {
      setChosenPlaces((prev) => prev.filter((p) => p.id !== place.id));
      return;
    }

    if (chosenPlaces.length >= MAX_PLACES) {
      Alert.alert("Limite atteinte", `Vous pouvez choisir ${MAX_PLACES} commerces au maximum.`);
      return;
    }

    const { distance, ...saved } = place;
    setChosenPlaces((prev) => [...prev, saved]);
  };

  const handleSelectAll = () => {
    const merged = [...chosenPlaces];
    for (const place of places) {
      if (merged.length >= MAX_PLACES) break;
      if (!merged.some((p) => p.id === place.id)) {
        const { distance, ...saved } = place;
        merged.push(saved);
      }
    }
    setChosenPlaces(merged);
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Erreur", "Donnez un titre à votre rappel.");
      return;
    }
    if (categories.length === 0) {
      Alert.alert("Erreur", "Choisissez au moins une catégorie de commerce.");
      return;
    }

    const input: ReminderInput = {
      title: title.trim(),
      categories,
      places: chosenPlaces,
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

        <Text style={styles.label}>Que recherchez-vous ?</Text>
        <Text style={styles.hint}>
          Ex : pour du pain, cochez Boulangerie et Supermarché. Lancez la recherche, puis touchez
          les commerces à surveiller (20 maximum). Si vous n'en choisissez aucun, tous les
          commerces de ces catégories autour de vous seront surveillés.
        </Text>

        <View style={styles.row}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              selected={categories.includes(c.key)}
              onPress={() => toggleCategory(c.key)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSearch}
          disabled={searching}
        >
          {searching ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.secondaryButtonText}>Rechercher autour de moi</Text>
          )}
        </TouchableOpacity>

        {searchError && <Text style={styles.error}>{searchError}</Text>}

        {searched && places.length === 0 && (
          <Text style={styles.hint}>Aucun commerce trouvé dans un rayon de 3 km.</Text>
        )}

        {places.length > 0 && (
          <>
            <Text style={styles.hint}>
              {places.length} commerce{places.length > 1 ? "s" : ""} (maximum {MAX_PLACES}, du plus
              proche au plus lointain) — touchez pour cocher :
            </Text>

            <TouchableOpacity onPress={handleSelectAll} style={{ marginBottom: 10 }}>
              <Text style={styles.link}>Tout sélectionner</Text>
            </TouchableOpacity>

            <PlaceList
              places={places}
              onSelect={handleTogglePlace}
              selectedIds={chosenPlaces.map((p) => p.id)}
            />
          </>
        )}

        {chosenPlaces.length > 0 && (
          <>
            <Text style={styles.label}>
              Commerces choisis ({chosenPlaces.length}/{MAX_PLACES})
            </Text>
            <Text style={styles.hint}>Touchez un commerce pour le retirer.</Text>
            <View style={styles.row}>
              {chosenPlaces.map((p) => (
                <Chip
                  key={p.id}
                  label={`${p.name}  ✕`}
                  selected
                  onPress={() => setChosenPlaces((prev) => prev.filter((x) => x.id !== p.id))}
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
  container: { padding: 25, paddingTop: 30, paddingBottom: 60 },
  screenTitle: { fontSize: 26, fontWeight: "bold", marginBottom: 25 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 14 },
  hint: { fontSize: 13, color: "#777777", marginBottom: 10 },
  error: { fontSize: 13, color: "#D64545", marginBottom: 10 },
  link: { color: "#5B4BDB", fontWeight: "600" },
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
  secondaryButton: {
    height: 48,
    borderWidth: 1,
    borderColor: "#5B4BDB",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryButtonText: { color: "#5B4BDB", fontWeight: "600" },
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
