import { CategoryKey } from "@/constants/categories";

// Un commerce choisi par l'utilisateur et enregistré avec un rappel.
export type SavedPlace = Omit<Place, "distance">;

// Un commerce trouvé via OpenStreetMap.
export interface Place {
  id: string; // ex : "node/123456"
  name: string;
  category: CategoryKey;
  latitude: number;
  longitude: number;
  distance: number; // mètres depuis la position de l'utilisateur
}
