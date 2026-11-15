import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ReminderItem } from "@/components/reminder-item";
import { useAuth } from "@/context/AuthContext";
import { useReminders } from "@/hooks/use-reminders";
import { logout } from "@/services/auth/authService";
import { deleteReminder, setReminderDone } from "@/services/reminders/reminderService";
import { Reminder } from "@/types/reminder";

type Tab = "active" | "done";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { active, done, loading, error } = useReminders();
  const [tab, setTab] = useState<Tab>("active");

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
      Alert.alert("Erreur", e.message)
    );
  };

  const handleDelete = (r: Reminder) => {
    Alert.alert("Supprimer", `Supprimer « ${r.title} » ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () =>
          deleteReminder(uid, r.id).catch((e) => Alert.alert("Erreur", e.message)),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes rappels</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "active" && styles.tabSelected]}
          onPress={() => setTab("active")}
        >
          <Text style={[styles.tabText, tab === "active" && styles.tabTextSelected]}>
            En cours ({active.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === "done" && styles.tabSelected]}
          onPress={() => setTab("done")}
        >
          <Text style={[styles.tabText, tab === "done" && styles.tabTextSelected]}>
            Terminés ({done.length})
          </Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>Erreur : {error}</Text>}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === "active" ? "Aucun rappel en cours." : "Aucun rappel terminé."}
            </Text>
          }
          renderItem={({ item }) => (
            <ReminderItem
              reminder={item}
              onToggleDone={() => handleToggle(item)}
              onPress={() =>
                router.push({ pathname: "/reminder-form", params: { id: item.id } })
              }
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push("/reminder-form")}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", paddingTop: 70, paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 30, fontWeight: "bold" },
  logout: { color: "#5B4BDB", fontWeight: "600" },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    padding: 3,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center" },
  tabSelected: { backgroundColor: "#FFFFFF" },
  tabText: { color: "#777777", fontWeight: "600" },
  tabTextSelected: { color: "#000000" },
  error: { color: "#D64545", marginBottom: 10 },
  empty: { textAlign: "center", color: "#999999", marginTop: 40 },
  fab: {
    position: "absolute",
    right: 25,
    bottom: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#5B4BDB",
    justifyContent: "center",
    alignItems: "center",
  },
  fabText: { color: "#FFFFFF", fontSize: 32, marginTop: -2 },
});
