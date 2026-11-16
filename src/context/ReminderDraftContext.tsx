import React, { createContext, ReactNode, useCallback, useContext, useState } from "react";

import { CategoryKey } from "@/constants/categories";
import { SavedPlace } from "@/types/place";

// Brouillon du rappel en cours de création / modification.
// Partagé entre le formulaire et l'écran carte, pour que la carte puisse
// modifier les catégories et les commerces choisis.
interface DraftContextType {
  categories: CategoryKey[];
  chosenPlaces: SavedPlace[];
  setCategories: (categories: CategoryKey[]) => void;
  setChosenPlaces: (places: SavedPlace[]) => void;
  reset: () => void;
}

const ReminderDraftContext = createContext<DraftContextType | null>(null);

export const ReminderDraftProvider = ({ children }: { children: ReactNode }) => {
  const [categories, setCategories] = useState<CategoryKey[]>([]);
  const [chosenPlaces, setChosenPlaces] = useState<SavedPlace[]>([]);

  const reset = useCallback(() => {
    setCategories([]);
    setChosenPlaces([]);
  }, []);

  return (
    <ReminderDraftContext.Provider
      value={{ categories, chosenPlaces, setCategories, setChosenPlaces, reset }}
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
