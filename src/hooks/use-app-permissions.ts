import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import {
  AppPermissions,
  getAppPermissions,
  requestMissingPermissions,
} from "@/services/permissions/permissionsService";

// État des permissions de l'appli.
//  - Au lancement : chaque permission manquante est demandée (tant que l'OS
//    l'autorise). Si tout est déjà accordé, rien n'est affiché.
//  - Au retour dans l'appli (ex. depuis les réglages) : on relit seulement
//    l'état, sans redemander, pour éviter une boucle de demandes.
export function useAppPermissions() {
  const [permissions, setPermissions] = useState<AppPermissions | null>(null);
  const requesting = useRef(false);

  const run = useCallback((action: () => Promise<AppPermissions>) => {
    // Une demande en cours fait passer l'appli en arrière-plan puis revenir :
    // on ne relance rien en parallèle.
    if (requesting.current) return Promise.resolve();
    requesting.current = true;
    return action()
      .then(setPermissions)
      .catch((error) =>
        console.error("Impossible de vérifier les permissions.", error),
      )
      .finally(() => {
        requesting.current = false;
      });
  }, []);

  const request = useCallback(() => run(requestMissingPermissions), [run]);
  const refresh = useCallback(() => run(getAppPermissions), [run]);

  useEffect(() => {
    void request();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => subscription.remove();
  }, [request, refresh]);

  return { permissions, request };
}
