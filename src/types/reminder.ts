import { CategoryKey } from "@/constants/categories";

export type ReminderMode = "favorite" | "nearby";
export type ReminderStatus = "active" | "done";

export interface Reminder {
  id: string;
  title: string;
  mode: ReminderMode;

  // Mode "favorite" : le commerce habituel de l'utilisateur.
  // Les coordonnées seront remplies à l'étape carte / géolocalisation.
  placeName: string | null;
  latitude: number | null;
  longitude: number | null;

  // Mode "nearby" : catégorie de commerce à rechercher autour de l'utilisateur.
  category: CategoryKey | null;

  radius: number; // mètres
  status: ReminderStatus;
  createdAt: number; // Date.now()
  completedAt: number | null;
}

// Ce que le formulaire fournit (le reste est géré par le service).
export type ReminderInput = Pick<
  Reminder,
  "title" | "mode" | "placeName" | "latitude" | "longitude" | "category" | "radius"
>;
