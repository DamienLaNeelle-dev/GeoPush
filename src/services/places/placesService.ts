import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  CATEGORIES,
  CategoryKey,
  MAX_PLACES,
  SEARCH_RADIUS,
} from "../../constants/categories";
import { Place } from "../../types/place";
import { distanceInMeters } from "../../utils/geo";

/*
  Recherche de commerces autour d'un point.

  Plusieurs "fournisseurs" gratuits (sans clé) sont essayés l'un après l'autre :
    - des serveurs Overpass (OpenStreetMap),
    - Nominatim (le moteur de recherche d'OpenStreetMap), placé en 3e position.
  Dès qu'un fournisseur échoue, le suivant démarre. Le premier qui répond gagne.
  Les serveurs publics demandent d'identifier l'application (User-Agent + Referer).
*/

const APP_HEADERS = {
  "User-Agent": "GeoPush/1.0 (projet etudiant, rappels geolocalises)",
  Referer: "https://geopush.app",
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://ovp.dresel.systems/api/interpreter", // serveur européen
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const STAGGER_DELAY = 3000; // si un fournisseur est lent, on lance le suivant après 3 s
const REQUEST_TIMEOUT = 15000; // 15 s max par fournisseur
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 h

type PlaceWithoutDistance = Omit<Place, "distance">;

interface Provider {
  name: string;
  run: (signal: AbortSignal) => Promise<PlaceWithoutDistance[]>;
}

const hostOf = (url: string) => url.replace(/^https?:\/\//, "").split("/")[0];

const osmTagOf = (key: CategoryKey) => {
  const category = CATEGORIES.find((c) => c.key === key);
  const [tag, value] = (category?.osm ?? "=").split("=");
  return { tag, value, label: category?.label ?? "Commerce" };
};

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new Error("annulé"));
    });
  });

const httpError = async (response: Response) => {
  const body = (await response.text())
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return new Error(`HTTP ${response.status}${body ? ` - ${body}` : ""}`);
};

// --- Fournisseur 1 : Overpass ------------------------------------------------

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const buildOverpassQuery = (
  lat: number,
  lon: number,
  categories: CategoryKey[],
  radius: number
): string => {
  const parts = categories
    .map((key) => {
      const { tag, value } = osmTagOf(key);
      return `nwr["${tag}"="${value}"](around:${radius},${lat},${lon});`;
    })
    .join("");

  return `[out:json][timeout:15];(${parts});out center tags;`;
};

const parseOverpass = (elements: OverpassElement[]): PlaceWithoutDistance[] => {
  const places: PlaceWithoutDistance[] = [];

  for (const el of elements) {
    const latitude = el.lat ?? el.center?.lat;
    const longitude = el.lon ?? el.center?.lon;
    const tags = el.tags ?? {};

    const category = CATEGORIES.find((c) => {
      const [tag, value] = c.osm.split("=");
      return tags[tag] === value;
    });

    if (latitude === undefined || longitude === undefined || !category) continue;

    places.push({
      id: `${el.type}/${el.id}`,
      name: tags.name ?? tags.brand ?? `${category.label} (sans nom)`,
      category: category.key,
      latitude,
      longitude,
    });
  }

  return places;
};

const overpassProvider = (url: string, query: string): Provider => ({
  name: hostOf(url),
  run: async (signal) => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...APP_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal,
    });

    if (!response.ok) throw await httpError(response);

    const data = await response.json();
    return parseOverpass(data.elements ?? []);
  },
});

// --- Fournisseur 2 : Nominatim -----------------------------------------------

const nominatimProvider = (
  lat: number,
  lon: number,
  categories: CategoryKey[],
  radius: number
): Provider => ({
  name: hostOf(NOMINATIM_URL),
  run: async (signal) => {
    // Boîte englobant le cercle de recherche (x = longitude, y = latitude).
    const dLat = radius / 111320;
    const dLon = radius / (111320 * Math.cos((lat * Math.PI) / 180));
    const viewbox = `${lon - dLon},${lat + dLat},${lon + dLon},${lat - dLat}`;

    const places: PlaceWithoutDistance[] = [];

    for (let i = 0; i < categories.length; i++) {
      // Nominatim impose au maximum 1 requête par seconde.
      if (i > 0) await sleep(1100, signal);

      const { value, label } = osmTagOf(categories[i]);
      const url =
        `${NOMINATIM_URL}?q=${encodeURIComponent(`[${value}]`)}` +
        `&viewbox=${viewbox}&bounded=1&limit=40&format=jsonv2`;

      const response = await fetch(url, {
        headers: { ...APP_HEADERS, Accept: "application/json" },
        signal,
      });

      if (!response.ok) throw await httpError(response);

      const results: any[] = await response.json();

      for (const r of results) {
        if (r.type !== value) continue;
        places.push({
          id: `${r.osm_type}/${r.osm_id}`,
          name: r.name || `${label} (sans nom)`,
          category: categories[i],
          latitude: parseFloat(r.lat),
          longitude: parseFloat(r.lon),
        });
      }
    }

    return places;
  },
});

// --- Course entre fournisseurs ----------------------------------------------

const runProviders = (allProviders: Provider[]): Promise<PlaceWithoutDistance[]> =>
  new Promise((resolve, reject) => {
    const providers = allProviders.filter(Boolean); // sécurité : ignore les entrées vides
    const controllers = providers.map(() => new AbortController());
    const started: boolean[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const failures: string[] = [];
    let settled = false;
    let finished = 0;

    if (providers.length === 0) {
      reject(new Error("Aucun service de recherche disponible."));
      return;
    }

    const stopAll = () => {
      timers.forEach(clearTimeout);
      controllers.forEach((c) => c.abort());
    };

    const start = async (i: number): Promise<void> => {
      const provider = providers[i];
      if (settled || !provider || started[i]) return; // rien à lancer
      started[i] = true;

      // Si ce fournisseur est lent, on lance le suivant sans attendre la fin.
      timers.push(setTimeout(() => void start(i + 1), STAGGER_DELAY));
      const timeout = setTimeout(() => controllers[i].abort(), REQUEST_TIMEOUT);
      timers.push(timeout);

      try {
        const places = await provider.run(controllers[i].signal);
        if (!settled) {
          settled = true;
          stopAll();
          resolve(places);
        }
      } catch (e: any) {
        if (!settled) {
          const message = String(e?.message ?? "erreur inconnue");
          const aborted = e?.name === "AbortError" || /cancel|abort|annulé/i.test(message);
          const detail = aborted ? "délai dépassé" : message;
          failures.push(`${provider.name} : ${detail}`);
          console.log(`[Recherche] ${provider.name} -> ${detail}`); // visible dans le terminal
          void start(i + 1); // échec : on passe tout de suite au suivant
        }
      } finally {
        clearTimeout(timeout);
        finished++;
        if (!settled && finished === providers.length) {
          settled = true;
          stopAll();
          reject(new Error(`Aucun service de recherche n'a répondu :\n${failures.join("\n")}`));
        }
      }
    };

    void start(0);
  });

// --- Cache local (pour ne pas solliciter les serveurs à chaque recherche) ----

// Clé arrondie à ~100 m : assez fin pour que chaque déplacement de carte
// donne des résultats frais, assez large pour éviter de rappeler les serveurs pour rien.
const cacheKey = (lat: number, lon: number, categories: CategoryKey[], radius: number) =>
  `places:v3:${lat.toFixed(3)}:${lon.toFixed(3)}:${[...categories].sort().join(",")}:${radius}`;

const readCache = async (key: string): Promise<PlaceWithoutDistance[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    const { savedAt, places } = JSON.parse(raw);
    if (Date.now() - savedAt > CACHE_TTL) return null;

    return places as PlaceWithoutDistance[];
  } catch {
    return null;
  }
};

const writeCache = async (key: string, places: PlaceWithoutDistance[]) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), places }));
  } catch {
    // Le cache est facultatif : on ignore les erreurs.
  }
};

// --- Fonction publique -------------------------------------------------------

// Renvoie les commerces des catégories demandées autour d'un point,
// triés du plus proche au plus lointain, limités à MAX_PLACES.
export const searchNearbyPlaces = async (
  latitude: number,
  longitude: number,
  categories: CategoryKey[],
  radius: number = SEARCH_RADIUS
): Promise<Place[]> => {
  if (categories.length === 0) return [];

  const key = cacheKey(latitude, longitude, categories, radius);

  let places = await readCache(key);

  if (!places) {
    const query = buildOverpassQuery(latitude, longitude, categories, radius);

    const [main, europe, ...others] = OVERPASS_ENDPOINTS.map((url) =>
      overpassProvider(url, query)
    );

    places = await runProviders([
      main,
      europe,
      nominatimProvider(latitude, longitude, categories, radius),
      ...others,
    ]);

    if (places.length > 0) await writeCache(key, places); // on ne garde pas un résultat vide
  }

  return places
    .filter((p) => categories.includes(p.category))
    .map((p) => ({
      ...p,
      distance: distanceInMeters(latitude, longitude, p.latitude, p.longitude),
    }))
    .filter((p) => p.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_PLACES);
};
