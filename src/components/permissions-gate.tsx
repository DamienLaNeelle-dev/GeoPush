import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAppPermissions } from "@/hooks/use-app-permissions";
import {
  PERMISSION_ORDER,
  PermissionKey,
  allGranted,
} from "@/services/permissions/permissionsService";

const LABELS: Record<PermissionKey, { title: string; why: string }> = {
  location: {
    title: "Position",
    why: "Pour trouver les commerces autour de vous.",
  },
  background: {
    title: "Position en arrière-plan (« Toujours »)",
    why: "Pour vous rappeler vos tâches quand vous passez près d'un lieu, même appli fermée.",
  },
  notifications: {
    title: "Notifications",
    why: "Pour vous prévenir quand vous êtes près d'un lieu.",
  },
};

// Bloque l'appli tant que les permissions indispensables ne sont pas accordées.
export function PermissionsGate({ children }: { children: ReactNode }) {
  const { permissions, request } = useAppPermissions();

  if (!permissions) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (allGranted(permissions)) return <>{children}</>;

  const missing = PERMISSION_ORDER.filter((key) => !permissions[key].granted);
  // L'OS ne réaffiche plus la demande : il faut passer par les réglages
  const needsSettings = missing.some((key) => !permissions[key].canAskAgain);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Autorisations nécessaires</Text>
      <Text style={styles.text}>
        GeoPush a besoin de ces autorisations pour vous rappeler vos tâches au
        bon endroit.
      </Text>

      {PERMISSION_ORDER.map((key) => {
        const granted = permissions[key].granted;
        return (
          <View key={key} style={styles.row}>
            <Text style={[styles.status, granted && styles.statusOk]}>
              {granted ? "✓" : "✕"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{LABELS[key].title}</Text>
              <Text style={styles.text}>{LABELS[key].why}</Text>
            </View>
          </View>
        );
      })}

      {needsSettings && (
        <Text style={styles.warning}>
          Une autorisation a été refusée : activez-la dans les réglages
          {missing.includes("background")
            ? " (Position : « Toujours »)"
            : ""}
          , puis revenez dans l&apos;appli.
        </Text>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={() => (needsSettings ? Linking.openSettings() : request())}
      >
        <Text style={styles.buttonText}>
          {needsSettings ? "Ouvrir les réglages" : "Autoriser"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 25,
    gap: 16,
    backgroundColor: "#FFFFFF",
  },
  title: { fontSize: 26, fontWeight: "bold" },
  text: { fontSize: 14, color: "#555555" },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  status: { fontSize: 18, fontWeight: "bold", color: "#D64545", width: 20 },
  statusOk: { color: "#2E9E5B" },
  rowTitle: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  warning: { fontSize: 14, color: "#D64545" },
  button: {
    height: 55,
    backgroundColor: "#5B4BDB",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
