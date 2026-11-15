import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

import { Chip } from "@/components/chip";
import { PlaceList } from "@/components/place-list";
import { CATEGORIES, CategoryKey, MAX_PLACES, getCategoryLabel } from "@/constants/categories";
import { useReminderDraft } from "@/context/ReminderDraftContext";
import { usePlaceSearch } from "@/hooks/use-place-search";
import { useReminders } from "@/hooks/use-reminders";
import { Coords, getCurrentCoords } from "@/services/location/locationService";
import { Place, SavedPlace } from "@/types/place";
import { distanceInMeters, formatDistance } from "@/utils/geo";

// Carte interactive.
//  - mode "pick" (depuis le formulaire) : on choisit les commerces d'un rappel.
//  - mode "view" (depuis l'accueil)     : on explore la carte, sans rien modifier.
export default function PlaceMapScreen() {
  const router = useRouter();
  const { mode, editId } = useLocalSearchParams<{ mode?: string; editId?: string }>();
  const picking = mode !== "view";

  const draft = useReminderDraft();
  const { active } = useReminders();
  const { places, loading, error, searched, search, reset } = usePlaceSearch();

  const [localCategories, setLocalCategories] = useState<CategoryKey[]>([]);
  const categories = picking ? draft.categories : localCategories;
  const chosen: SavedPlace[] = picking ? draft.chosenPlaces : [];

  const [user, setUser] = useState<Coords | null>(null);
  const [ready, setReady] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);
  const centerRef = useRef<Coords | null>(null); // centre actuel de la carte

  // 1. Position de l'utilisateur au démarrage.
  useEffect(() => {
    getCurrentCoords()
      .then((coords) => {
        setUser(coords);
        centerRef.current = coords;
      })
      .catch(() =>
        setLocationError("Position indisponible : autorisez la localisation dans les réglages.")
      )
      .finally(() => setReady(true));
  }, []);

  // 2. À chaque changement de catégories, on relance la recherche autour du centre de la carte.
  useEffect(() => {
    if (!ready) return;
    if (categories.length === 0) {
      reset();
      return;
    }
    search(categories, centerRef.current ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, ready]);

  // Distances calculées depuis l'utilisateur (et non depuis le centre de la recherche).
  const results: Place[] = useMemo(() => {
    const list = places.map((p) =>
      user
        ? { ...p, distance: distanceInMeters(user.latitude, user.longitude, p.latitude, p.longitude) }
        : p
    );
    return list.sort((a, b) => a.distance - b.distance);
  }, [places, user]);

  const distanceTo = (p: { latitude: number; longitude: number }): string | null =>
    user
      ? formatDistance(distanceInMeters(user.latitude, user.longitude, p.latitude, p.longitude))
      : null;

  // Lieux déjà associés à d'autres rappels actifs.
  const otherSaved = useMemo(() => {
    const seen = new Set<string>([...results.map((p) => p.id), ...chosen.map((p) => p.id)]);
    const out: { reminderTitle: string; place: SavedPlace }[] = [];
    for (const reminder of active) {
      if (reminder.id === editId) continue;
      for (const place of reminder.places) {
        if (seen.has(place.id)) continue;
        seen.add(place.id);
        out.push({ reminderTitle: reminder.title, place });
      }
    }
    return out;
  }, [active, results, chosen, editId]);

  const chosenIds = chosen.map((p) => p.id);
  const unchosenResults = results.filter((p) => !chosenIds.includes(p.id));

  const focusOn = (p: { latitude: number; longitude: number }) =>
    mapRef.current?.animateToRegion(
      { latitude: p.latitude, longitude: p.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      400
    );

  const toggleCategory = (key: CategoryKey) => {
    const removing = categories.includes(key);
    const next = removing ? categories.filter((k) => k !== key) : [...categories, key];

    if (picking) {
      draft.setCategories(next);
      // On retire aussi les commerces choisis de la catégorie décochée.
      if (removing) draft.setChosenPlaces(chosen.filter((p) => p.category !== key));
    } else {
      setLocalCategories(next);
    }
  };

  const togglePlace = (place: Place) => {
    if (!picking) return;

    if (chosenIds.includes(place.id)) {
      draft.setChosenPlaces(chosen.filter((p) => p.id !== place.id));
      return;
    }

    if (chosen.length >= MAX_PLACES) {
      Alert.alert("Limite atteinte", `Vous pouvez choisir ${MAX_PLACES} commerces au maximum.`);
      return;
    }

    const { distance, ...saved } = place;
    draft.setChosenPlaces([...chosen, saved]);
  };

  const searchHere = () => {
    if (categories.length === 0) {
      Alert.alert("Catégorie", "Choisissez d'abord une catégorie de commerce.");
      return;
    }
    search(categories, centerRef.current ?? undefined);
  };

  const initialRegion = user
    ? { latitude: user.latitude, longitude: user.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : { latitude: 46.6, longitude: 2.4, latitudeDelta: 9, longitudeDelta: 9 }; // France

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.hint}>Localisation en cours…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        onRegionChangeComplete={(r) => {
          centerRef.current = { latitude: r.latitude, longitude: r.longitude };
        }}
      >
        {/* Résultats de la recherche (rouge) */}
        {unchosenResults.map((p) => (
          <Marker
            key={`r-${p.id}`}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            title={p.name}
            description={`${getCategoryLabel(p.category)} · ${distanceTo(p) ?? ""}`}
            pinColor="red"
            onPress={() => togglePlace(p)}
          />
        ))}

        {/* Commerces choisis pour ce rappel (vert) */}
        {chosen.map((p) => (
          <Marker
            key={`c-${p.id}`}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            title={`✓ ${p.name}`}
            description={`${getCategoryLabel(p.category)} · ${distanceTo(p) ?? ""}`}
            pinColor="green"
            onPress={() => togglePlace({ ...p, distance: 0 })}
          />
        ))}

        {/* Lieux associés à d'autres rappels (violet) */}
        {otherSaved.map(({ reminderTitle, place }) => (
          <Marker
            key={`o-${place.id}`}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            title={place.name}
            description={`Rappel : ${reminderTitle} · ${distanceTo(place) ?? ""}`}
            pinColor="purple"
          />
        ))}
      </MapView>

      {/* Barre du haut : fermer + catégories */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              selected={categories.includes(c.key)}
              onPress={() => toggleCategory(c.key)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Recentrer sur ma position */}
      {user && (
        <TouchableOpacity style={styles.locateButton} onPress={() => focusOn(user)}>
          <Text style={{ fontSize: 20 }}>📍</Text>
        </TouchableOpacity>
      )}

      {/* Panneau du bas : résultats */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>
            {categories.length === 0
              ? "Choisissez une catégorie"
              : loading
                ? "Recherche…"
                : `${results.length} commerce${results.length > 1 ? "s" : ""}`}
            {picking && chosen.length > 0 ? ` · ${chosen.length} choisi${chosen.length > 1 ? "s" : ""}` : ""}
          </Text>

          <TouchableOpacity onPress={searchHere} disabled={loading}>
            {loading ? <ActivityIndicator /> : <Text style={styles.link}>Rechercher dans cette zone</Text>}
          </TouchableOpacity>
        </View>

        {locationError && <Text style={styles.error}>{locationError}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        {searched && !loading && results.length === 0 && (
          <Text style={styles.hint}>Aucun commerce trouvé ici : déplacez la carte et relancez.</Text>
        )}

        {results.length > 0 && (
          <ScrollView style={{ maxHeight: 200 }}>
            <PlaceList
              places={results}
              selectedIds={chosenIds}
              onSelect={(p) => {
                focusOn(p);
                togglePlace(p);
              }}
            />
          </ScrollView>
        )}

        {picking && (
          <TouchableOpacity style={styles.validate} onPress={() => router.back()}>
            <Text style={styles.validateText}>
              {chosen.length > 0 ? `Valider (${chosen.length})` : "Valider"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 55,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 12,
  },
  closeText: { fontSize: 16, fontWeight: "bold" },
  chips: { gap: 8, paddingRight: 16 },
  locateButton: {
    position: "absolute",
    right: 16,
    bottom: 330,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 34,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  panelTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  link: { color: "#5B4BDB", fontWeight: "600" },
  hint: { fontSize: 13, color: "#777777", marginTop: 8 },
  error: { fontSize: 13, color: "#D64545", marginBottom: 8 },
  validate: {
    height: 50,
    backgroundColor: "#5B4BDB",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  validateText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
