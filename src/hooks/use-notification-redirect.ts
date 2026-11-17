// src/hooks/use-notification-redirect.ts
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";

function redirect(response: Notifications.NotificationResponse | null) {
  // Un tap sur la notification elle-même, pas sur un bouton d'action
  if (response?.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER)
    return;

  // Le contenu vient de l'extérieur : on n'accepte que les routes existantes.
  const url = response.notification.request.content.data?.url;
  if (url === "/place-map") {
    router.push({ pathname: "/place-map", params: { mode: "view" } });
  }

  // Pour ne pas rejouer ce tap au prochain rechargement
  Notifications.clearLastNotificationResponse();
}

export function useNotificationRedirect() {
  useEffect(() => {
    let isMounted = true;

    // Appli fermée : le tap qui l'a lancée
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (isMounted) redirect(response);
    });
    // Appli ouverte ou en arrière-plan
    const subscription =
      Notifications.addNotificationResponseReceivedListener(redirect);

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);
}
