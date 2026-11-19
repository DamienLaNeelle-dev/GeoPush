import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";

import { Chip } from "@/components/chip";
import { PlaceList } from "@/components/place-list";
import {
  CATEGORIES,
  CategoryKey,
  MAX_PLACES,
  SEARCH_RADIUS,
  getCategoryLabel,
} from "@/constants/categories";
import { useReminderDraft } from "@/context/ReminderDraftContext";
import { usePlaceSearch } from "@/hooks/use-place-search";
import { useReminders } from "@/hooks/use-reminders";
import { Coords, getCurrentCoords } from "@/services/location/locationService";
import { openDirections } from "@/services/navigation/navigationService";
import { Place, SavedPlace } from "@/types/place";
import { distanceInMeters, formatDistance } from "@/utils/geo";

const METERS_PER_DEGREE = 111320;
const SEARCH_DEBOUNCE = 600; // ms d'attente après la fin du déplacement de la carte
const MIN_RADIUS = 500;
const MAX_RADIUS = 5000;

// Rayon de recherche déduit du zoom : la moitié de la zone visible, arrondi à 250 m.
const radiusFromRegion = (r: Region): number => {
  const half = (r.latitudeDelta * METERS_PER_DEGREE) / 2;
  const rounded = Math.round(half / 250) * 250;
  return Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, rounded));
};

// Carte interactive.
//  - mode "pick" (depuis le formulaire) : on choisit les commerces d'un rappel.
//  - mode "view" (depuis une notification) : on affiche les lieux d'un rappel, sans rien modifier.
// Dans les deux cas, seuls les lieux du rappel concerné sont affichés.
export default function PlaceMapScreen() {
  const router = useRouter();
  const { mode, reminderId, placeId } = useLocalSearchParams<{
    mode?: string;
    reminderId?: string;
    placeId?: string;
  }>();
  const picking = mode !== "view";

  const draft = useReminderDraft();
  const { reminders } = useReminders();
  const { places, loading, error, searched, search, reset } = usePlaceSearch();

  // Rappel affiché en mode "view"
  const viewedReminder = useMemo(
    () => (picking ? undefined : reminders.find((r) => r.id === reminderId)),
    [picking, reminders, reminderId]
  );

  // null = pas encore modifiées : on part des catégories du rappel affiché
  const [localCategories, setLocalCategories] = useState<CategoryKey[] | null>(null);
  const categories = useMemo(
    () => (picking ? draft.categories : localCategories ?? viewedReminder?.categories ?? []),
    [picking, draft.categories, localCategories, viewedReminder]
  );
  const chosen: SavedPlace[] = useMemo(
    () => (picking ? draft.chosenPlaces : viewedReminder?.places ?? []),
    [picking, draft.chosenPlaces, viewedReminder]
  );

  const [user, setUser] = useState<Coords | null>(null);
  const [ready, setReady] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  // Commerce actuellement sélectionné (affiche le bouton « Y aller »)
  // undefined = rien touché : on sélectionne le lieu de la notification
  const [selectedState, setSelected] = useState<SavedPlace | null | undefined>(undefined);
  const selected =
    selectedState !== undefined
      ? selectedState
      : viewedReminder?.places.find((p) => p.id === placeId) ?? null;

  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const fittedRef = useRef(false); // la carte a déjà été cadrée sur les lieux du rappel
  const centerRef = useRef<Coords | null>(null); // centre actuel de la carte
  const radiusRef = useRef<number>(SEARCH_RADIUS); // rayon déduit du zoom actuel
  const lastSearchRef = useRef<{ center: Coords; radius: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoriesRef = useRef<CategoryKey[]>(categories); // valeur à jour dans les callbacks
  categoriesRef.current = categories;

  // Lance une recherche autour du centre de la carte et mémorise où on a cherché.
  const runSearch = useCallback(
    (center?: Coords, radius?: number) => {
      const c = center ?? centerRef.current ?? undefined;
      const r = radius ?? radiusRef.current;
      if (c) lastSearchRef.current = { center: c, radius: r };
      search(categoriesRef.current, c, r);
    },
    [search]
  );

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

  // 1 ter. Cadre la carte sur les lieux du rappel (une seule fois).
  useEffect(() => {
    if (!mapReady || fittedRef.current || chosen.length === 0) return;
    fittedRef.current = true;
    const coords = chosen.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
    if (coords.length === 1) {
      mapRef.current?.animateToRegion(
        { ...coords[0], latitudeDelta: 0.01, longitudeDelta: 0.01 },
        400
      );
      return;
    }
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 140, right: 60, bottom: 360, left: 60 },
      animated: true,
    });
  }, [mapReady, chosen]);

  // 2. À chaque changement de catégories, on relance la recherche autour du centre de la carte.
  useEffect(() => {
    if (!ready) return;
    if (categories.length === 0) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      lastSearchRef.current = null;
      reset();
      return;
    }
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, ready]);

  // Nettoyage du timer en quittant l'écran.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // 3. La carte a fini de bouger : on recalcule les commerces si on s'est assez déplacé.
  const handleRegionChangeComplete = (r: Region) => {
    const center = { latitude: r.latitude, longitude: r.longitude };
    const radius = radiusFromRegion(r);
    centerRef.current = center;
    radiusRef.current = radius;

    if (categoriesRef.current.length === 0) return;

    const last = lastSearchRef.current;
    if (last) {
      const visibleMeters = r.latitudeDelta * METERS_PER_DEGREE;
      const moved = distanceInMeters(
        last.center.latitude,
        last.center.longitude,
        center.latitude,
        center.longitude
      );
      const movedEnough = moved > Math.max(200, visibleMeters * 0.25);
      const zoomChanged = radius / last.radius >= 1.5 || last.radius / radius >= 1.5;
      if (!movedEnough && !zoomChanged) return; // quasi pas bougé : on garde les résultats
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(center, radius), SEARCH_DEBOUNCE);
  };

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

  const goTo = (place: SavedPlace) => {
    openDirections(place.latitude, place.longitude, place.name).catch(() =>
      Alert.alert("Itinéraire", "Impossible d'ouvrir l'application de cartes.")
    );
  };

  const togglePlace = (place: Place) => {
    const { distance, ...saved } = place;
    setSelected(saved);
    if (!picking) return;

    if (chosenIds.includes(place.id)) {
      draft.setChosenPlaces(chosen.filter((p) => p.id !== place.id));
      return;
    }

    if (chosen.length >= MAX_PLACES) {
      Alert.alert("Limite atteinte", `Vous pouvez choisir ${MAX_PLACES} commerces au maximum.`);
      return;
    }

    draft.setChosenPlaces([...chosen, saved]);
  };

  // Bouton manuel (secours) : relance tout de suite, sans attendre le debounce.
  const searchHere = () => {
    if (categories.length === 0) {
      Alert.alert("Catégorie", "Choisissez d'abord une catégorie de commerce.");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch();
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
        onMapReady={() => setMapReady(true)}
        onRegionChangeComplete={handleRegionChangeComplete}
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

        {/* Commerces de ce rappel (vert) */}
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
        {/* Commerce sélectionné : guidage GPS */}
        {selected && (
          <View style={styles.selectedCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedName} numberOfLines={1}>
                {selected.name}
              </Text>
              <Text style={styles.hintInline}>
                {getCategoryLabel(selected.category)}
                {distanceTo(selected) ? ` · ${distanceTo(selected)}` : ""}
              </Text>
            </View>
            <TouchableOpacity style={styles.goButton} onPress={() => goTo(selected)}>
              <Text style={styles.goText}>Y aller</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelected(null)} hitSlop={10}>
              <Text style={styles.dismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {viewedReminder && (
          <Text style={styles.reminderTitle} numberOfLines={1}>
            {viewedReminder.title}
          </Text>
        )}

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
          <Text style={styles.hint}>Aucun commerce trouvé ici : déplacez la carte pour explorer d'autres zones.</Text>
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
  reminderTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
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
  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#F2F0FF",
  },
  selectedName: { fontSize: 15, fontWeight: "700" },
  hintInline: { fontSize: 13, color: "#777777", marginTop: 2 },
  goButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#5B4BDB",
  },
  goText: { color: "#FFFFFF", fontWeight: "bold" },
  dismiss: { fontSize: 16, color: "#777777" },
});