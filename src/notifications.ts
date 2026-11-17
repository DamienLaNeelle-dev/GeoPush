// src/notifications.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Notification reçue appli ouverte : on l'affiche quand même
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// iOS : toute notification passe par un canal, à créer avant la permission et le token
if (Platform.OS === "ios") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Général",
    description: "Notifications générales",
    importance: Notifications.AndroidImportance.MAX,
  });
}
