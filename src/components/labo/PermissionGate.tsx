import { type ReactNode, useEffect } from "react";
import {
  AppState,
  Button,
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  title: string;
  message: string;
  permission: { granted: boolean; canAskAgain: boolean } | null;
  request: () => Promise<unknown>;
  refresh: () => Promise<unknown>;
  children: ReactNode;
};

export function PermissionGate({
  title,
  message,
  permission,
  request,
  refresh,
  children,
}: Props) {
  // Le hook ne se met pas à jour au retour des réglages : on relit l'état
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  if (!permission) return <Text style={styles.box}>Vérification...</Text>;
  if (permission.granted) return <>{children}</>;

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{title}</Text>
      <Text>{message}</Text>
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
  title: { fontSize: 20, fontWeight: "700" },
  warning: { color: "#b3261e" },
});
