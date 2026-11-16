import { useCallback, useRef, useState } from "react";

import { CategoryKey } from "@/constants/categories";
import { getCurrentCoords, LOCATION_PERMISSION_DENIED } from "@/services/location/locationService";
import { searchNearbyPlaces } from "@/services/places/placesService";
import { Place } from "@/types/place";

// Position GPS + recherche des commerces autour de l'utilisateur.
export function usePlaceSearch() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const lastRequest = useRef(0); // numéro de la dernière recherche lancée

  const search = useCallback(async (categories: CategoryKey[]) => {
    const requestId = ++lastRequest.current;
    setLoading(true);
    setError(null);

    try {
      const { latitude, longitude } = await getCurrentCoords();
      const result = await searchNearbyPlaces(latitude, longitude, categories);
      if (requestId !== lastRequest.current) return; // une recherche plus récente a été lancée
      setPlaces(result);
      setSearched(true);
    } catch (e: any) {
      if (requestId !== lastRequest.current) return;
      setPlaces([]);
      setSearched(false);
      setError(
        e?.message === LOCATION_PERMISSION_DENIED
          ? "Autorisez la localisation dans les réglages de l'iPhone pour rechercher des commerces."
          : e?.message ?? "Recherche impossible."
      );
    } finally {
      if (requestId === lastRequest.current) setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    lastRequest.current++; // invalide une éventuelle recherche en cours
    setLoading(false);
    setPlaces([]);
    setError(null);
    setSearched(false);
  }, []);

  return { places, loading, error, searched, search, reset };
}
