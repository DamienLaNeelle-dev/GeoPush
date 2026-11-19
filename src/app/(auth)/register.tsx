import { useState } from "react";

import { Alert, Pressable, StyleSheet, Text } from "react-native";

import { useRouter } from "expo-router";

import { AuthScreen } from "@/components/ui/auth-screen";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { colors } from "@/constants/ui";
import { register } from "@/services/auth/authService";

export default function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    try {
      setLoading(true);

      await register(email.trim(), password);

      Alert.alert("Compte créé", "Vous pouvez maintenant vous connecter.");
      router.replace("/login");
    } catch (error: any) {
      let message = "Impossible de créer le compte.";

      if (error.code === "auth/email-already-in-use") {
        message = "Cette adresse email est déjà utilisée.";
      } else if (error.code === "auth/invalid-email") {
        message = "Adresse email invalide.";
      } else if (error.code === "auth/weak-password") {
        message = "Le mot de passe est trop faible.";
      }

      Alert.alert("Inscription impossible", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      title="Créer un compte"
      subtitle="Quelques secondes et vos rappels vous suivent partout."
      footer={
        <Pressable onPress={() => router.replace("/login")} hitSlop={8}>
          <Text style={styles.footerText}>
            Déjà un compte ? <Text style={styles.footerLink}>Se connecter</Text>
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
      />

      <TextField
        label="Mot de passe"
        icon="lock"
        placeholder="6 caractères minimum"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleRegister}
      />

      <Button
        title="Créer mon compte"
        onPress={handleRegister}
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
