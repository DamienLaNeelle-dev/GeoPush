import { type ReactNode, useEffect } from "react";
import {
  AppState,
  Button,
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Détail facultatif quand le portail regroupe plusieurs permissions
export type PermissionItem = {
  label: string;
  description?: string;
  granted: boolean;
};

type Props = {
  title: string;
  message: string;
  permission: { granted: boolean; canAskAgain: boolean } | null;
  request: () => Promise<unknown>;
  refresh: () => Promise<unknown>;
  items?: PermissionItem[];
  children: ReactNode;
};

export function PermissionGate({
  title,
  message,
  permission,
  request,
  refresh,
  items,
  children,
}: Props) {
  // Le hook ne se met pas à jour au retour des réglages : on relit l'état
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  if (!permission)
    return (
      <View style={[styles.box, styles.centered]}>
        <Text>Vérification...</Text>
      </View>
    );
  if (permission.granted) return <>{children}</>;

  return (
    <View style={[styles.box, styles.centered]}>
      <Text style={styles.title}>{title}</Text>
      <Text>{message}</Text>
      {items?.map((item) => (
        <View key={item.label} style={styles.item}>
          <Text style={[styles.status, item.granted && styles.statusOk]}>
            {item.granted ? "✓" : "✕"}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemLabel}>{item.label}</Text>
            {item.description && (
              <Text style={styles.itemDescription}>{item.description}</Text>
            )}
          </View>
        </View>
      ))}
      {permission.canAskAgain ? (
        <Button title="Autoriser" onPress={() => request()} />
      ) : (
        <>
          <Text style={styles.warning}>
            Permission refusée : seuls les réglages peuvent la rétablir.
          </Text>
          <Button
            title="Ouvrir les réglages"
            onPress={() => Linking.openSettings()}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 24, gap: 12 },
  // Occupe tout l'écran et centre le contenu verticalement
  centered: { flex: 1, justifyContent: "center", backgroundColor: "#FFFFFF" },
  title: { fontSize: 20, fontWeight: "700" },
  warning: { color: "#b3261e" },
  item: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  status: { fontSize: 18, fontWeight: "bold", color: "#b3261e", width: 20 },
  statusOk: { color: "#2e7d32" },
  itemLabel: { fontSize: 16, fontWeight: "600" },
  itemDescription: { color: "#555555" },
});
