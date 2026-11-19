import React, { createContext, ReactNode, useCallback, useContext, useState } from "react";

import { CategoryKey, DEFAULT_RADIUS } from "@/constants/categories";
import { SavedPlace } from "@/types/place";

// Brouillon du rappel en cours de création / modification.
// Partagé entre le formulaire et l'écran carte, pour que la carte puisse
// modifier les catégories et les commerces choisis.
interface DraftContextType {
  categories: CategoryKey[];
  chosenPlaces: SavedPlace[];
  radius: number; // rayon de déclenchement, en mètres
  setCategories: (categories: CategoryKey[]) => void;
  setChosenPlaces: (places: SavedPlace[]) => void;
  setRadius: (radius: number) => void;
  reset: () => void;
}

const ReminderDraftContext = createContext<DraftContextType | null>(null);

export const ReminderDraftProvider = ({ children }: { children: ReactNode }) => {
  const [categories, setCategories] = useState<CategoryKey[]>([]);
  const [chosenPlaces, setChosenPlaces] = useState<SavedPlace[]>([]);
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS);

  const reset = useCallback(() => {
    setCategories([]);
    setChosenPlaces([]);
    setRadius(DEFAULT_RADIUS);
  }, []);

  return (
    <ReminderDraftContext.Provider
      value={{ categories,
        chosenPlaces,
        radius,
        setCategories,
        setChosenPlaces,
        setRadius,
        reset,
      }}
    >
      {children}
    </ReminderDraftContext.Provider>
  );
};

export const useReminderDraft = (): DraftContextType => {
  const context = useContext(ReminderDraftContext);
  if (!context) {
    throw new Error("useReminderDraft doit être utilisé dans un ReminderDraftProvider");
  }
  return context;
};
