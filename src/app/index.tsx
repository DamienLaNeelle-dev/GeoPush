import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ReminderItem } from "@/components/reminder-item";
import { Button } from "@/components/ui/button";
import { Icon, IconName } from "@/components/ui/icon";
import { colors, font, radius, shadow, spacing } from "@/constants/ui";
import { useAuth } from "@/context/AuthContext";
import { useReminders } from "@/hooks/use-reminders";
import { logout } from "@/services/auth/authService";
import {
  deleteReminder,
  setReminderDone,
} from "@/services/reminders/reminderService";
import { Reminder } from "@/types/reminder";

type Tab = "active" | "done";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { active, done, loading, error } = useReminders();
  const [tab, setTab] = useState<Tab>("active");
  const insets = useSafeAreaInsets();

  if (!user) {
    return <Redirect href="/login" />;
  }

  const uid = user.uid;
  const data = tab === "active" ? active : done;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e: any) {
      Alert.alert("Déconnexion impossible", e?.message ?? "Erreur inconnue");
    }
  };

  const handleToggle = (r: Reminder) => {
    setReminderDone(uid, r.id, r.status === "active").catch((e) =>
      Alert.alert("Erreur", e.message),
    );
  };

  const handleDelete = (r: Reminder) => {
    Alert.alert("Supprimer", `Supprimer « ${r.title} » ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () =>
          deleteReminder(uid, r.id).catch((e) =>
            Alert.alert("Erreur", e.message),
          ),
      },
    ]);
  };

  // Prénom approximatif tiré de l'email (avant le @ et le premier point)
  const name = (user.email ?? "").split("@")[0].split(/[._-]/)[0];
  const greeting = name
    ? `Bonjour ${name.charAt(0).toUpperCase()}${name.slice(1)}`
    : "Bonjour";

  const tabs = [
    { key: "active" as const, label: "En cours", count: active.length },
    { key: "done" as const, label: "Terminés", count: done.length },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={loading ? [] : data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: spacing.lg + 4,
          paddingBottom: insets.bottom + 120,
        }}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>{greeting} 👋</Text>
                <Text style={styles.title}>Mes rappels</Text>
              </View>
              <HeaderButton
                icon="bell"
                label="Notifications"
                onPress={() => router.push("/notifications")}
              />
              <HeaderButton
                icon="logout"
                label="Se déconnecter"
                onPress={handleLogout}
              />
            </View>

            {/* Résumé */}
            <View style={styles.summary}>
              <View style={styles.summaryIcon}>
                <Icon name="location" size={22} color={colors.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryValue}>
                  {active.length} rappel{active.length > 1 ? "s" : ""} actif
                  {active.length > 1 ? "s" : ""}
                </Text>
                <Text style={styles.summaryText}>
                  {active.length > 0
                    ? "On vous prévient dès que vous passez à proximité."
                    : "Créez un rappel pour être prévenu près d'un commerce."}
                </Text>
              </View>
            </View>

            {/* Onglets */}
            <View style={styles.tabs}>
              {tabs.map(({ key, label, count }) => {
                const selected = tab === key;
                return (
                  <Pressable
                    key={key}
                    style={[styles.tab, selected && styles.tabSelected]}
                    onPress={() => setTab(key)}
                  >
                    <Text
                      style={[styles.tabText, selected && styles.tabTextSelected]}
                    >
                      {label}
                    </Text>
                    <View style={[styles.count, selected && styles.countSelected]}>
                      <Text
                        style={[
                          styles.countText,
                          selected && styles.countTextSelected,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {error && <Text style={styles.error}>Erreur : {error}</Text>}
            {loading && (
              <ActivityIndicator
                style={{ marginTop: 40 }}
                size="large"
                color={colors.primary}
              />
            )}
          </>
        }
        ListEmptyComponent={
          loading ? undefined : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Text style={{ fontSize: 36 }}>
                  {tab === "active" ? "🗺️" : "🎉"}
                </Text>
              </View>
              <Text style={styles.emptyTitle}>
                {tab === "active" ? "Aucun rappel en cours" : "Rien de terminé"}
              </Text>
              <Text style={styles.emptyText}>
                {tab === "active"
                  ? "Ajoutez une tâche et choisissez les commerces où elle doit vous être rappelée."
                  : "Les rappels que vous cochez apparaîtront ici."}
              </Text>
              {tab === "active" && (
                <Button
                  title="Créer un rappel"
                  icon="add"
                  onPress={() => router.push("/reminder-form")}
                  style={{ marginTop: spacing.xl, alignSelf: "center" }}
                />
              )}
            </View>
          )
        }
        renderItem={({ item }) => (
          <ReminderItem
            reminder={item}
            onToggleDone={() => handleToggle(item)}
            onPress={() =>
              router.push({
                pathname: "/reminder-form",
                params: { id: item.id },
              })
            }
            onDelete={() => handleDelete(item)}
          />
        )}
      />

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + 24 },
          pressed && styles.fabPressed,
        ]}
        onPress={() => router.push("/reminder-form")}
        accessibilityRole="button"
        accessibilityLabel="Nouveau rappel"
      >
        <Icon name="add" size={22} color={colors.onPrimary} />
        <Text style={styles.fabText}>Nouveau</Text>
      </Pressable>
    </View>
  );
}

function HeaderButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.6 }]}
    >
      <Icon name={icon} size={18} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: spacing.xl,
  },
  greeting: { fontSize: 15, color: colors.textMuted, marginBottom: 2 },
  title: { ...font.title, color: colors.text },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    ...shadow(1),
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    marginBottom: spacing.xl,
    ...shadow(2),
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryValue: { fontSize: 18, fontWeight: "800", color: colors.onPrimary },
  summaryText: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  tabSelected: { backgroundColor: colors.surface, ...shadow(1) },
  tabText: { color: colors.textMuted, fontWeight: "600" },
  tabTextSelected: { color: colors.text, fontWeight: "700" },
  count: {
    minWidth: 22,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  countSelected: { backgroundColor: colors.primary },
  countText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  countTextSelected: { color: colors.onPrimary },
  error: { color: colors.danger, marginBottom: 10 },
  empty: { alignItems: "center", paddingTop: 32, paddingHorizontal: 16 },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: { ...font.heading, color: colors.text },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 21,
  },
  fab: {
    position: "absolute",
    right: 20,
    height: 58,
    paddingHorizontal: 22,
    borderRadius: 29,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    ...shadow(3),
  },
  fabPressed: { backgroundColor: colors.primaryDark },
  fabText: { color: colors.onPrimary, fontSize: 16, fontWeight: "700" },
});
