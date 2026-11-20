import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Circle, Marker, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip } from "@/components/chip";
import { PlaceList } from "@/components/place-list";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  CATEGORIES,
  CategoryKey,
  MAX_PLACES,
  RADIUS_OPTIONS,
  SEARCH_RADIUS,
  formatRadius,
  getCategoryEmoji,
  getCategoryLabel,
} from "@/constants/categories";
import { colors, font, radius, shadow, spacing } from "@/constants/ui";
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
const PANEL_PEEK = 64; // hauteur du panneau restant visible une fois baissé

// Rayon de recherche déduit du zoom : la moitié de la zone visible, arrondi à 250 m.
const radiusFromRegion = (r: Region): number => {
  const half = (r.latitudeDelta * METERS_PER_DEGREE) / 2;
  const rounded = Math.round(half / 250) * 250;
  return Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, rounded));
};

// Carte interactive.
//  - mode "pick" (depuis le formulaire) : on choisit les commerces d'un rappel.
//  - mode "view" (depuis l'accueil)     : on explore la carte, sans rien modifier.
// Seuls les lieux du rappel ouvert sont affichés, jamais ceux des autres rappels.
export default function PlaceMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, reminderId, placeId } = useLocalSearchParams<{
    mode?: string;
    reminderId?: string; // mode "view" : rappel à afficher (depuis une notification)
    placeId?: string; // mode "view" : lieu de la notification, sélectionné d'office
  }>();
  const picking = mode !== "view";

  const draft = useReminderDraft();
  const { reminders } = useReminders();
  // Rappel affiché en mode "view"
  const viewedReminder = useMemo(
    () => (picking ? undefined : reminders.find((r) => r.id === reminderId)),
    [picking, reminders, reminderId],
  );
  const { places, loading, error, searched, search, reset } = usePlaceSearch();

  // Mode "view" : null = pas encore modifiées, on part des catégories du rappel
  const [localCategories, setLocalCategories] = useState<CategoryKey[] | null>(
    null,
  );
  const categories = useMemo(
    () =>
      picking
        ? draft.categories
        : (localCategories ?? viewedReminder?.categories ?? []),
    [picking, draft.categories, localCategories, viewedReminder],
  );
  // Uniquement les lieux du rappel en cours : jamais ceux des autres rappels
  const chosen: SavedPlace[] = useMemo(
    () => (picking ? draft.chosenPlaces : (viewedReminder?.places ?? [])),
    [picking, draft.chosenPlaces, viewedReminder],
  );

  const [user, setUser] = useState<Coords | null>(null);
  const [ready, setReady] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  // Commerce actuellement sélectionné (affiche le bouton « Y aller »)
  // undefined = rien touché : on sélectionne le lieu de la notification
  const [selectedState, setSelected] = useState<
    SavedPlace | null | undefined
  >(undefined);
  const selected =
    selectedState !== undefined
      ? selectedState
      : (viewedReminder?.places.find((p) => p.id === placeId) ?? null);

  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const fittedRef = useRef(false); // carte déjà cadrée sur les lieux du rappel
  const centerRef = useRef<Coords | null>(null); // centre actuel de la carte
  const radiusRef = useRef<number>(SEARCH_RADIUS); // rayon déduit du zoom actuel
  const lastSearchRef = useRef<{ center: Coords; radius: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoriesRef = useRef<CategoryKey[]>(categories); // valeur à jour dans les callbacks
  categoriesRef.current = categories;

  // Panneau du bas : on peut le baisser (glisser vers le bas) puis le remonter.
  // translateY = 0 : panneau ouvert ; translateY = collapsedOffset : panneau baissé.
  const [panelY] = useState(() => new Animated.Value(0));
  const [panelHeight, setPanelHeight] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const collapsedOffset = Math.max(
    0,
    panelHeight - PANEL_PEEK - insets.bottom,
  );
  const setPanelCollapsed = useCallback(
    (value: boolean) => {
      setCollapsed(value);
      Animated.spring(panelY, {
        toValue: value ? collapsedOffset : 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 14,
      }).start();
    },
    [collapsedOffset, panelY],
  );

  // Recréé quand l'état du panneau change (jamais pendant un geste)
  const panResponder = useMemo(() => {
    const start = collapsed ? collapsedOffset : 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => panelY.stopAnimation(),
      onPanResponderMove: (_, g) => {
        panelY.setValue(Math.min(collapsedOffset, Math.max(0, start + g.dy)));
      },
      onPanResponderRelease: (_, g) => {
        // Simple appui sur la poignée : on bascule
        if (Math.abs(g.dy) < 5) {
          setPanelCollapsed(!collapsed);
          return;
        }
        const pos = start + g.dy;
        setPanelCollapsed(
          g.vy > 0.5 || (g.vy > -0.5 && pos > collapsedOffset / 2),
        );
      },
      onPanResponderTerminate: () => setPanelCollapsed(collapsed),
    });
  }, [collapsed, collapsedOffset, panelY, setPanelCollapsed]);

  // Si le contenu du panneau change de taille alors qu'il est baissé, on le garde baissé.
  useEffect(() => {
    if (collapsed) panelY.setValue(collapsedOffset);
  }, [collapsed, collapsedOffset, panelY]);

  // Lance une recherche autour du centre de la carte et mémorise où on a cherché.
  const runSearch = useCallback(
    (center?: Coords, radius?: number) => {
      const c = center ?? centerRef.current ?? undefined;
      const r = radius ?? radiusRef.current;
      if (c) lastSearchRef.current = { center: c, radius: r };
      search(categoriesRef.current, c, r);
    },
    [search],
  );

  // 1. Position de l'utilisateur au démarrage.
  useEffect(() => {
    getCurrentCoords()
      .then((coords) => {
        setUser(coords);
        centerRef.current = coords;
      })
      .catch(() =>
        setLocationError(
          "Position indisponible : autorisez la localisation dans les réglages.",
        ),
      )
      .finally(() => setReady(true));
  }, []);

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

  // À l'ouverture d'un rappel : on cadre la carte sur ses lieux (une seule fois).
  useEffect(() => {
    if (!mapReady || fittedRef.current || chosen.length === 0) return;
    fittedRef.current = true;
    const coords = chosen.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
    }));
    if (coords.length === 1) {
      mapRef.current?.animateToRegion(
        { ...coords[0], latitudeDelta: 0.01, longitudeDelta: 0.01 },
        400,
      );
      return;
    }
    mapRef.current?.fitToCoordinates(coords, {
      // Marges pour ne pas cacher de lieu sous la barre du haut ou le panneau
      edgePadding: { top: 160, right: 60, bottom: 420, left: 60 },
      animated: true,
    });
  }, [mapReady, chosen]);

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
        center.longitude,
      );
      const movedEnough = moved > Math.max(200, visibleMeters * 0.25);
      const zoomChanged =
        radius / last.radius >= 1.5 || last.radius / radius >= 1.5;
      if (!movedEnough && !zoomChanged) return; // quasi pas bougé : on garde les résultats
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => runSearch(center, radius),
      SEARCH_DEBOUNCE,
    );
  };

  // Distances calculées depuis l'utilisateur (et non depuis le centre de la recherche).
  const results: Place[] = useMemo(() => {
    const list = places.map((p) =>
      user
        ? {
            ...p,
            distance: distanceInMeters(
              user.latitude,
              user.longitude,
              p.latitude,
              p.longitude,
            ),
          }
        : p,
    );
    return list.sort((a, b) => a.distance - b.distance);
  }, [places, user]);

  const distanceTo = (p: {
    latitude: number;
    longitude: number;
  }): string | null =>
    user
      ? formatDistance(
          distanceInMeters(
            user.latitude,
            user.longitude,
            p.latitude,
            p.longitude,
          ),
        )
      : null;

  const chosenIds = chosen.map((p) => p.id);
  const unchosenResults = results.filter((p) => !chosenIds.includes(p.id));

  const focusOn = (p: { latitude: number; longitude: number }) =>
    mapRef.current?.animateToRegion(
      {
        latitude: p.latitude,
        longitude: p.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      400,
    );

  // Zoome pour que tout le cercle du rayon soit visible
  // (le panneau du bas cache environ la moitié inférieure de la carte).
  const showRadius = (center: Coords, radius: number) => {
    const delta = ((radius * 2) / METERS_PER_DEGREE) * 2.2;
    mapRef.current?.animateToRegion(
      {
        latitude: center.latitude - delta * 0.25,
        longitude: center.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      400,
    );
  };

  const toggleCategory = (key: CategoryKey) => {
    const removing = categories.includes(key);
    const next = removing
      ? categories.filter((k) => k !== key)
      : [...categories, key];

    if (picking) {
      draft.setCategories(next);
      // On retire aussi les commerces choisis de la catégorie décochée.
      if (removing)
        draft.setChosenPlaces(chosen.filter((p) => p.category !== key));
    } else {
      setLocalCategories(next);
    }
  };

  const goTo = (place: SavedPlace) => {
    openDirections(place.latitude, place.longitude, place.name).catch(() =>
      Alert.alert("Itinéraire", "Impossible d'ouvrir l'application de cartes."),
    );
  };

  const togglePlace = (place: Place) => {
    const { distance, ...saved } = place;
    setSelected(saved);
    if (collapsed) setPanelCollapsed(false); // on remonte pour afficher « Y aller »
    if (!picking) return;

    if (chosenIds.includes(place.id)) {
      draft.setChosenPlaces(chosen.filter((p) => p.id !== place.id));
      return;
    }

    if (chosen.length >= MAX_PLACES) {
      Alert.alert(
        "Limite atteinte",
        `Vous pouvez choisir ${MAX_PLACES} commerces au maximum.`,
      );
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
    ? {
        latitude: user.latitude,
        longitude: user.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      }
    : { latitude: 46.6, longitude: 2.4, latitudeDelta: 9, longitudeDelta: 9 }; // France

  if (!ready) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingIcon}>
          <Icon name="location" size={28} color={colors.primary} />
        </View>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.hint}>Localisation en cours…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        onMapReady={() => setMapReady(true)}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {/* Rayon de déclenchement autour de ma position */}
        {picking && user && (
          <Circle
            center={user}
            radius={draft.radius}
            strokeWidth={2}
            strokeColor="rgba(91, 75, 219, 0.9)"
            fillColor="rgba(91, 75, 219, 0.12)"
          />
        )}

        {/* Résultats de la recherche */}
        {unchosenResults.map((p) => (
          <Marker
            key={`r-${p.id}`}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            title={`${getCategoryEmoji(p.category)} ${p.name}`}
            description={`${getCategoryLabel(p.category)} · ${distanceTo(p) ?? ""}`}
            pinColor={colors.primary}
            onPress={() => togglePlace(p)}
          />
        ))}

        {/* Commerces choisis pour ce rappel */}
        {chosen.map((p) => (
          <Marker
            key={`c-${p.id}`}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            title={`✓ ${p.name}`}
            description={`${getCategoryLabel(p.category)} · ${distanceTo(p) ?? ""}`}
            pinColor={colors.success}
            onPress={() => togglePlace({ ...p, distance: 0 })}
          />
        ))}

      </MapView>

      {/* Barre du haut : fermer + catégories */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <Pressable
            style={styles.roundButton}
            onPress={() => router.back()}
            accessibilityLabel="Fermer la carte"
            hitSlop={6}
          >
            <Icon name="close" size={16} color={colors.text} />
          </Pressable>
          <View style={styles.titlePill}>
            <Text style={styles.titleText}>
              {picking
                ? "Choisir les commerces"
                : (viewedReminder?.title ?? "Explorer la carte")}
            </Text>
          </View>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {CATEGORIES.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              emoji={c.emoji}
              selected={categories.includes(c.key)}
              onPress={() => toggleCategory(c.key)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Bas de l'écran : bouton de recentrage + panneau */}
      <Animated.View
        style={[styles.bottom, { transform: [{ translateY: panelY }] }]}
        pointerEvents="box-none"
      >
        {user && (
          <Pressable
            style={styles.locateButton}
            onPress={() => focusOn(user)}
            accessibilityLabel="Recentrer sur ma position"
          >
            <Icon name="myLocation" size={22} color={colors.primary} />
          </Pressable>
        )}

        <View
          style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}
          onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}
        >
          {/* Poignée : glisser vers le bas pour baisser, vers le haut pour remonter */}
          <View
            style={styles.handleZone}
            {...panResponder.panHandlers}
            accessible
            accessibilityRole="button"
            accessibilityLabel={
              collapsed ? "Remonter le panneau" : "Baisser le panneau"
            }
            accessibilityActions={[{ name: "activate" }]}
            onAccessibilityAction={() => setPanelCollapsed(!collapsed)}
          >
            <View style={styles.handle} />
          </View>

          {/* Commerce sélectionné : guidage GPS */}
          {selected && (
            <View style={styles.selectedCard}>
              <View style={styles.selectedEmoji}>
                <Text style={{ fontSize: 20 }}>
                  {getCategoryEmoji(selected.category)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedName} numberOfLines={1}>
                  {selected.name}
                </Text>
                <Text style={styles.hintInline}>
                  {getCategoryLabel(selected.category)}
                  {distanceTo(selected) ? ` · ${distanceTo(selected)}` : ""}
                </Text>
              </View>
              <Pressable
                style={styles.goButton}
                onPress={() => goTo(selected)}
              >
                <Icon name="directions" size={16} color={colors.onPrimary} />
                <Text style={styles.goText}>Y aller</Text>
              </Pressable>
              <Pressable
                onPress={() => setSelected(null)}
                hitSlop={10}
                accessibilityLabel="Fermer"
              >
                <Icon name="close" size={14} color={colors.textSubtle} />
              </Pressable>
            </View>
          )}

          {/* Rayon de déclenchement (le cercle sur la carte) */}
          {picking && (
            <View style={styles.radiusRow}>
              <View style={styles.radiusLabel}>
                <Icon name="radius" size={16} color={colors.primary} />
                <Text style={styles.radiusText}>Rayon</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                {RADIUS_OPTIONS.map((r) => (
                  <Chip
                    key={r}
                    label={formatRadius(r)}
                    selected={draft.radius === r}
                    onPress={() => {
                      draft.setRadius(r);
                      if (user) showRadius(user, r);
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.panelHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>
                {categories.length === 0
                  ? "Choisissez une catégorie"
                  : loading
                    ? "Recherche…"
                    : `${results.length} commerce${results.length > 1 ? "s" : ""}`}
              </Text>
              {picking && chosen.length > 0 && (
                <Text style={styles.panelSub}>
                  {chosen.length} choisi{chosen.length > 1 ? "s" : ""} sur{" "}
                  {MAX_PLACES}
                </Text>
              )}
            </View>

            <Pressable
              onPress={searchHere}
              disabled={loading}
              style={styles.searchButton}
            >
              {loading ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <>
                  <Icon name="search" size={14} color={colors.primary} />
                  <Text style={styles.link}>Chercher ici</Text>
                </>
              )}
            </Pressable>
          </View>

          {locationError && <Text style={styles.error}>{locationError}</Text>}
          {error && <Text style={styles.error}>{error}</Text>}
          {categories.length === 0 && (
            <Text style={styles.hint}>
              Touchez une catégorie en haut de l&apos;écran pour afficher les
              commerces autour de vous.
            </Text>
          )}
          {searched && !loading && results.length === 0 && (
            <Text style={styles.hint}>
              Aucun commerce trouvé ici : déplacez la carte pour explorer
              d&apos;autres zones.
            </Text>
          )}

          {results.length > 0 && (
            <ScrollView style={{ maxHeight: 210 }}>
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
            <Button
              title={
                chosen.length > 0 ? `Valider (${chosen.length})` : "Valider"
              }
              icon="check"
              onPress={() => router.back()}
              style={{ marginTop: spacing.md }}
            />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.background,
  },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    gap: 10,
    paddingBottom: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    ...shadow(2),
  },
  titlePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    ...shadow(2),
  },
  titleText: { fontSize: 15, fontWeight: "700", color: colors.text },
  chips: { gap: 8, paddingHorizontal: spacing.lg, paddingVertical: 4 },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0 },
  locateButton: {
    alignSelf: "flex-end",
    marginRight: spacing.lg,
    marginBottom: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    ...shadow(2),
  },
  panel: {
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow(3),
  },
  // Zone tactile large autour de la poignée
  handleZone: {
    marginHorizontal: -spacing.lg,
    marginTop: -10,
    paddingTop: 10,
    paddingBottom: 14,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    marginHorizontal: -spacing.lg,
    paddingLeft: spacing.lg,
  },
  radiusLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  radiusText: { fontSize: 14, fontWeight: "700", color: colors.text },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  panelTitle: { ...font.heading, color: colors.text },
  panelSub: { fontSize: 13, color: colors.success, fontWeight: "600", marginTop: 2 },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  link: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  hint: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  error: { fontSize: 13, color: colors.danger, marginBottom: 8 },
  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    marginBottom: 14,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  selectedEmoji: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedName: { fontSize: 15, fontWeight: "700", color: colors.text },
  hintInline: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  goButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  goText: { color: colors.onPrimary, fontWeight: "700" },
});
