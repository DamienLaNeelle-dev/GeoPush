import { CategoryKey } from "@/constants/categories";
import { SavedPlace } from "@/types/place";

export type ReminderStatus = "active" | "done";

export interface Reminder {
  id: string;
  title: string;

  // Catégories de commerces à rechercher autour de l'utilisateur (ex. boulangerie, supermarché).
  categories: CategoryKey[];

  // Commerces précis choisis dans la liste (facultatif, 20 maximum).
  // Liste vide = tous les commerces des catégories autour de l'utilisateur.
  places: SavedPlace[];

  radius: number; // rayon de déclenchement, en mètres
  status: ReminderStatus;
  createdAt: number; // Date.now()
  completedAt: number | null;
}

// Ce que le formulaire fournit (le reste est géré par le service).
export type ReminderInput = Pick<Reminder, "title" | "categories" | "places" | "radius">;
