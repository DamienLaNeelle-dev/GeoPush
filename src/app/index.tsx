import { Redirect } from "expo-router";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { logout } from "@/services/auth/authService";

export default function HomeScreen() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/login" />;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error: any) {
      Alert.alert("Déconnexion impossible", error?.message ?? "Erreur inconnue");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Page principale</Text>

      <Text style={styles.subtitle}>Connecté en tant que {user.email}</Text>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#777777",
    marginBottom: 35,
  },
  button: {
    height: 55,
    alignSelf: "stretch",
    backgroundColor: "#5B4BDB",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});