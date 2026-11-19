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

import { Chip } from "@/components/chip";
import {
  MAX_PLACES,
  RADIUS_OPTIONS,
  formatRadius,
  getCategoryLabels,
} from "@/constants/categories";
import { useAuth } from "@/context/AuthContext";
import { useReminderDraft } from "@/context/ReminderDraftContext";
import { useReminders } from "@/hooks/use-reminders";
import {
  createReminder,
  updateReminder,
} from "@/services/reminders/reminderService";
import { ReminderInput } from "@/types/reminder";

export default function ReminderFormScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { reminders } = useReminders();

  // Catégories, commerces et rayon : stockés dans le brouillon, car la carte les modifie aussi.
  const {
    categories,
    chosenPlaces,
    radius,
    setCategories,
    setChosenPlaces,
    setRadius,
    reset,
  } = useReminderDraft();

  const isEdit = !!id;

  const [title, setTitle] = useState("");

  // Nouveau rappel : on repart d'un brouillon vide.
  useEffect(() => {
    if (!isEdit) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Modification : on pré-remplit le formulaire une seule fois.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!isEdit || prefilled.current) return;
    const existing = reminders.find((r) => r.id === id);
    if (!existing) return;

    setTitle(existing.title);
    setRadius(existing.radius);
    setCategories(existing.categories);
    setChosenPlaces(existing.places);
    prefilled.current = true;
  }, [isEdit, id, reminders, setCategories, setChosenPlaces, setRadius]);

  if (!user) {
    return <Redirect href="/login" />;
  }

  const openMap = () =>
    router.push({
      pathname: "/place-map",
      params: { mode: "pick", editId: id ?? "" },
    });

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Erreur", "Donnez un titre à votre rappel.");
      return;
    }
    if (categories.length === 0) {
      Alert.alert(
        "Erreur",
        "Ouvrez la carte et choisissez au moins une catégorie de commerce.",
      );
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
      isEdit && id
        ? updateReminder(user.uid, id, input)
        : createReminder(user.uid, input);

    request.catch((e) => Alert.alert("Enregistrement impossible", e.message));
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
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

        <Text style={styles.label}>Où vous le rappeler ?</Text>
        <Text style={styles.hint}>
          Ouvrez la carte, choisissez les types de commerces (boulangerie,
          boucherie…), puis touchez les commerces à surveiller. Sans commerce
          précis, tous ceux des catégories choisies autour de vous seront
          surveillés.
        </Text>

        <TouchableOpacity style={styles.mapButton} onPress={openMap}>
          <Text style={styles.mapButtonText}>🗺️ Choisir sur la carte</Text>
        </TouchableOpacity>

        {categories.length > 0 ? (
          <Text style={styles.summary}>
            Catégories : {getCategoryLabels(categories)}
          </Text>
        ) : (
          <Text style={styles.hint}>
            Aucune catégorie choisie pour le moment.
          </Text>
        )}

        {chosenPlaces.length > 0 && (
          <>
            <Text style={styles.label}>
              Commerces choisis ({chosenPlaces.length}/{MAX_PLACES})
            </Text>
            <Text style={styles.hint}>
              Touchez un commerce pour le retirer.
            </Text>
            <View style={styles.row}>
              {chosenPlaces.map((p) => (
                <Chip
                  key={p.id}
                  label={`${p.name}  ✕`}
                  selected
                  onPress={() =>
                    setChosenPlaces(chosenPlaces.filter((x) => x.id !== p.id))
                  }
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
  summary: { fontSize: 14, color: "#333333", marginBottom: 6 },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  mapButton: {
    height: 52,
    borderWidth: 1,
    borderColor: "#5B4BDB",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  mapButtonText: { color: "#5B4BDB", fontWeight: "700", fontSize: 15 },
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
