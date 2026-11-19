import { type ReactNode, useEffect } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/ui/button";
import { Icon, IconName } from "@/components/ui/icon";
import { colors, font, radius, shadow, spacing } from "@/constants/ui";

// Détail facultatif quand le portail regroupe plusieurs permissions
export type PermissionItem = {
  label: string;
  description?: string;
  icon?: IconName;
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
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.message}>Vérification...</Text>
      </View>
    );
  if (permission.granted) return <>{children}</>;

  return (
    <View style={[styles.box, styles.centered]}>
      <View style={styles.hero}>
        <Icon name="location" size={32} color={colors.onPrimary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {items && (
        <View style={styles.card}>
          {items.map((item, index) => (
            <View
              key={item.label}
              style={[styles.item, index > 0 && styles.itemBorder]}
            >
              <View
                style={[
                  styles.itemIcon,
                  item.granted ? styles.itemIconOk : styles.itemIconKo,
                ]}
              >
                <Icon
                  name={item.icon ?? "lock"}
                  size={18}
                  color={item.granted ? colors.success : colors.danger}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                {item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}
              </View>
              <View
                style={[
                  styles.status,
                  item.granted ? styles.statusOk : styles.statusKo,
                ]}
              >
                <Icon
                  name={item.granted ? "check" : "close"}
                  size={12}
                  color={colors.onPrimary}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {permission.canAskAgain ? (
        <Button title="Autoriser" icon="check" onPress={() => request()} />
      ) : (
        <>
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              Permission refusée : seuls les réglages peuvent la rétablir.
            </Text>
          </View>
          <Button
            title="Ouvrir les réglages"
            icon="settings"
            onPress={() => Linking.openSettings()}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: spacing.xl, gap: spacing.lg },
  // Occupe tout l'écran et centre le contenu verticalement
  centered: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  hero: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    ...shadow(2),
  },
  title: { ...font.heading, fontSize: 24, color: colors.text, textAlign: "center" },
  message: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: "center",
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    ...shadow(1),
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  itemBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  itemIconOk: { backgroundColor: colors.successSoft },
  itemIconKo: { backgroundColor: colors.dangerSoft },
  itemLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
  itemDescription: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  status: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  statusOk: { backgroundColor: colors.success },
  statusKo: { backgroundColor: colors.danger },
  warning: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  warningText: { color: colors.danger, fontSize: 14, textAlign: "center" },
});
