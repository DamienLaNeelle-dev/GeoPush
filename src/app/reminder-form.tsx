import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip } from "@/components/chip";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { TextField } from "@/components/ui/text-field";
import {
  MAX_PLACES,
  RADIUS_OPTIONS,
  formatRadius,
  getCategoryEmoji,
  getCategoryLabel,
} from "@/constants/categories";
import { colors, font, radius as radii, shadow, spacing } from "@/constants/ui";
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
  const insets = useSafeAreaInsets();

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
      params: { mode: "pick" },
    });

  // Le bouton n'est actif que si le rappel est complet : un titre, au moins
  // un commerce précis (une catégorie seule ne suffit pas) et un rayon.
  // Le rayon vaut 500 m par défaut, donc il est toujours renseigné.
  // Un commerce ne compte que s'il appartient à une catégorie cochée
  const validPlaces = chosenPlaces.filter((p) =>
    categories.includes(p.category),
  );
  const missing: string[] = [];
  if (!title.trim()) missing.push("un titre");
  if (validPlaces.length === 0) missing.push("au moins un commerce");
  if (!radius) missing.push("une distance");
  const canSubmit = missing.length === 0;

  const handleSave = () => {
    if (!canSubmit) {
      Alert.alert("Rappel incomplet", `Ajoutez ${missing.join(", ")}.`);
      return;
    }

    const input: ReminderInput = {
      title: title.trim(),
      categories,
      places: validPlaces,
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
    <View style={styles.screen}>
      {/* En-tête de la modale */}
      {/* iOS : feuille modale (pas d'encoche) ; Android : plein écran */}
      <View
        style={[
          styles.topBar,
          { paddingTop: Platform.OS === "ios" ? spacing.lg : insets.top + 8 },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.iconButton}
          accessibilityLabel="Fermer"
        >
          <Icon name="close" size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>
          {isEdit ? "Modifier le rappel" : "Nouveau rappel"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. Quoi */}
          <Section step={1} title="Que faut-il vous rappeler ?">
            <TextField
              icon="sparkles"
              placeholder="Ex : Acheter du pain"
              value={title}
              onChangeText={setTitle}
              returnKeyType="done"
            />
          </Section>

          {/* 2. Où */}
          <Section step={2} title="Où vous le rappeler ?">
            <Pressable
              onPress={openMap}
              style={({ pressed }) => [
                styles.mapCard,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.mapIcon}>
                <Icon name="map" size={22} color={colors.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mapTitle}>
                  {categories.length > 0
                    ? "Modifier sur la carte"
                    : "Choisir sur la carte"}
                </Text>
                <Text style={styles.mapText}>
                  {categories.length > 0
                    ? `${categories.length} catégorie${categories.length > 1 ? "s" : ""} · ${
                        chosenPlaces.length > 0
                          ? `${chosenPlaces.length} commerce${chosenPlaces.length > 1 ? "s" : ""}`
                          : "aucun commerce choisi"
                      }`
                    : "Types de commerces et lieux précis"}
                </Text>
              </View>
              <Icon name="chevronRight" size={16} color={colors.primary} />
            </Pressable>

            {categories.length > 0 ? (
              <View style={styles.row}>
                {categories.map((key) => (
                  <View key={key} style={styles.tag}>
                    <Text style={styles.tagText}>
                      {getCategoryEmoji(key)} {getCategoryLabel(key)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.hint}>
                Choisissez les types de commerces (boulangerie, boucherie…),
                puis sélectionnez les commerces à surveiller.
              </Text>
            )}

            {chosenPlaces.length > 0 && (
              <>
                <Text style={styles.subLabel}>
                  Commerces choisis · {chosenPlaces.length}/{MAX_PLACES}
                </Text>
                <View style={styles.places}>
                  {chosenPlaces.map((p) => (
                    <View key={p.id} style={styles.placeRow}>
                      <Text style={{ fontSize: 16 }}>
                        {getCategoryEmoji(p.category)}
                      </Text>
                      <Text style={styles.placeName} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Pressable
                        hitSlop={10}
                        accessibilityLabel={`Retirer ${p.name}`}
                        onPress={() =>
                          setChosenPlaces(
                            chosenPlaces.filter((x) => x.id !== p.id),
                          )
                        }
                      >
                        <Icon
                          name="close"
                          size={14}
                          color={colors.textSubtle}
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Section>

          {/* 3. Rayon */}
          <Section
            step={3}
            title="À quelle distance ?"
            hint="Vous serez prévenu en entrant dans ce rayon autour d'un commerce."
          >
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
          </Section>
        </ScrollView>

        {/* Bouton fixé en bas */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          {!canSubmit && (
            <Text style={styles.missing}>
              Pour enregistrer, ajoutez {missing.join(", ")}.
            </Text>
          )}
          <Button
            title={isEdit ? "Enregistrer les modifications" : "Créer le rappel"}
            icon="check"
            onPress={handleSave}
            disabled={!canSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.step}>
          <Text style={styles.stepText}>{step}</Text>
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    ...shadow(1),
  },
  topTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  container: { padding: spacing.lg, paddingBottom: 40, gap: spacing.lg },
  section: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    gap: spacing.md,
    ...shadow(1),
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  step: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
  },
  stepText: { fontSize: 13, fontWeight: "800", color: colors.primary },
  sectionTitle: { ...font.subheading, color: colors.text, flex: 1 },
  hint: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  subLabel: { ...font.overline, color: colors.textSubtle, marginTop: 4 },
  mapCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  mapIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  mapTitle: { fontSize: 15, fontWeight: "700", color: colors.primary },
  mapText: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  tagText: { fontSize: 13, fontWeight: "600", color: colors.text },
  places: { gap: 6 },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
  placeName: { flex: 1, fontSize: 14, fontWeight: "500", color: colors.text },
  missing: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
