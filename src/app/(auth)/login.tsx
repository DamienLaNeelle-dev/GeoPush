import { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";
import { login } from "../../services/auth/authService";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    try {
      setLoading(true);

      await login(email.trim(), password);

      router.replace("/");
    } catch (error: any) {
      let message = "Une erreur est survenue.";

      if (error.code === "auth/invalid-credential") {
        message = "Email ou mot de passe incorrect.";
      } else if (error.code === "auth/invalid-email") {
        message = "Adresse email invalide.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Trop de tentatives. Réessayez plus tard.";
      } else if (error.code === "auth/network-request-failed") {
        message = "Problème de connexion internet.";
      }

      Alert.alert("Connexion impossible", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Bienvenue !</Text>

        <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>

        <Text style={styles.label}>Adresse email</Text>

        <TextInput
          style={styles.input}
          placeholder="exemple@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Mot de passe</Text>

        <TextInput
          style={styles.input}
          placeholder="Votre mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/register")}>
          <Text style={styles.link}>Pas encore de compte ? Créer un compte</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingHorizontal: 25,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#777777",
    marginBottom: 35,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  button: {
    height: 55,
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
  link: {
    color: "#5B4BDB",
    textAlign: "center",
    marginTop: 25,
  },
});