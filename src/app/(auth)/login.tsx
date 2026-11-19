import { useState } from "react";

import { Alert, Pressable, StyleSheet, Text } from "react-native";

import { useRouter } from "expo-router";

import { AuthScreen } from "@/components/ui/auth-screen";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { colors } from "@/constants/ui";
import { login } from "@/services/auth/authService";

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
    <AuthScreen
      title="Bon retour !"
      subtitle="Connectez-vous pour retrouver vos rappels."
      footer={
        <Pressable onPress={() => router.replace("/register")} hitSlop={8}>
          <Text style={styles.footerText}>
            Pas encore de compte ?{" "}
            <Text style={styles.footerLink}>Créer un compte</Text>
          </Text>
        </Pressable>
      }
    >
      <TextField
        label="Adresse email"
        icon="mail"
        placeholder="exemple@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />

      <TextField
        label="Mot de passe"
        icon="lock"
        placeholder="Votre mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
      />

      <Button
        title="Se connecter"
        onPress={handleLogin}
        loading={loading}
        style={{ marginTop: 8 }}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footerText: { fontSize: 15, color: colors.textMuted },
  footerLink: { color: colors.primary, fontWeight: "700" },
});
