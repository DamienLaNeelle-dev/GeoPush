// Catégories de commerces proposables pour un rappel "à proximité".
// `osm` = le tag OpenStreetMap qu'on utilisera plus tard avec Overpass.
export const CATEGORIES = [
  { key: "bakery", label: "Boulangerie", osm: "shop=bakery" },
  { key: "supermarket", label: "Supermarché", osm: "shop=supermarket" },
  { key: "convenience", label: "Supérette", osm: "shop=convenience" },
  { key: "pharmacy", label: "Pharmacie", osm: "amenity=pharmacy" },
  { key: "butcher", label: "Boucherie", osm: "shop=butcher" },
  { key: "greengrocer", label: "Primeur", osm: "shop=greengrocer" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export const getCategoryLabel = (key: CategoryKey | null): string =>
  CATEGORIES.find((c) => c.key === key)?.label ?? "";

// Rayons de déclenchement proposés (en mètres).
export const RADIUS_OPTIONS = [100, 250, 500, 1000, 2000] as const;

export const formatRadius = (meters: number): string =>
  meters >= 1000 ? `${meters / 1000} km` : `${meters} m`;
