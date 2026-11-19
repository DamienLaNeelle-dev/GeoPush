// Logique « entrée de zone » : pure, sans dépendance à expo, AsyncStorage ou
// au GPS, pour pouvoir être testée facilement (voir geofence-entry.test.ts).
// La tâche de geofencing (tasks/geofencingTask.ts) se contente de lire/écrire
// l'état dans AsyncStorage et d'appeler `evaluateGeofenceEvent`.

export const GEOFENCE_LAST_NOTIFIED_KEY = "@geopush/geofence-last-notified";
// Zones dans lesquelles l'utilisateur se trouve déjà (déjà notifié)
export const GEOFENCE_INSIDE_KEY = "@geopush/geofence-inside";

// Délai minimum entre deux notifications pour une même zone : 15 minutes
export const GEOFENCE_NOTIFICATION_COOLDOWN_MS = 15 * 60 * 1000;

export type InsideRegions = Record<string, true>;
// Identifiant de zone -> date (Date.now()) de la dernière notification
export type LastNotifiedRegions = Record<string, number>;

export type GeofenceEvent = "enter" | "exit";

export type GeofenceAction =
  | "notify" // il faut envoyer la notification
  | "exited" // sortie de zone enregistrée, rien à notifier
  | "ignored-already-inside" // « Enter » en double : on est déjà dans la zone
  | "ignored-cooldown"; // une notification a déjà été envoyée il y a moins de 15 min

export type GeofenceDecision = {
  action: GeofenceAction;
  // Nouvel état à sauvegarder (les objets reçus ne sont jamais modifiés)
  inside: InsideRegions;
  lastNotified: LastNotifiedRegions;
};

type EvaluateParams = {
  event: GeofenceEvent;
  regionId: string;
  inside: InsideRegions;
  lastNotified: LastNotifiedRegions;
  now: number;
  cooldownMs?: number;
};

export const evaluateGeofenceEvent = ({
  event,
  regionId,
  inside,
  lastNotified,
  now,
  cooldownMs = GEOFENCE_NOTIFICATION_COOLDOWN_MS,
}: EvaluateParams): GeofenceDecision => {
  if (event === "exit") {
    // Sortie de zone : la prochaine entrée pourra de nouveau notifier
    const { [regionId]: _removed, ...insideAfterExit } = inside;
    return { action: "exited", inside: insideAfterExit, lastNotified };
  }

  // L'OS renvoie un « Enter » à chaque (ré)enregistrement des zones, donc
  // à chaque ouverture de l'appli si on est déjà dedans : on l'ignore.
  if (inside[regionId]) {
    return { action: "ignored-already-inside", inside, lastNotified };
  }

  const insideAfterEnter: InsideRegions = { ...inside, [regionId]: true };

  // Anti-doublon : pas de nouvelle alerte avant la fin du délai
  if (now - (lastNotified[regionId] ?? 0) < cooldownMs) {
    return {
      action: "ignored-cooldown",
      inside: insideAfterEnter,
      lastNotified,
    };
  }

  return {
    action: "notify",
    inside: insideAfterEnter,
    lastNotified: { ...lastNotified, [regionId]: now },
  };
};
