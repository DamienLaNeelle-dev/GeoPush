import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AppPermissions,
  PERMISSION_ORDER,
  getAppPermissions,
  requestMissingPermissions,
} from "@/services/permissions/permissionsService";

// État des permissions de l'appli.
//  - Au lancement : chaque permission manquante est demandée (tant que l'OS
//    l'autorise). Si tout est déjà accordé, rien n'est affiché.
//  - Au retour dans l'appli (ex. depuis les réglages) : `refresh` relit
//    seulement l'état, sans redemander, pour éviter une boucle de demandes.
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

  // Au lancement : demande ce qui manque. Le retour dans l'appli (relecture
  // de l'état) est géré par PermissionGate via `refresh`.
  useEffect(() => {
    void request();
  }, [request]);

  // Vue combinée pour PermissionGate : accordé si les 3 le sont, et on ne peut
  // redemander que si l'OS accepte encore d'afficher chaque demande manquante.
  const combined = useMemo(() => {
    if (!permissions) return null;
    const missing = PERMISSION_ORDER.filter((key) => !permissions[key].granted);
    return {
      granted: missing.length === 0,
      canAskAgain: missing.every((key) => permissions[key].canAskAgain),
    };
  }, [permissions]);

  return { permissions, combined, request, refresh };
}
