import { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { colors, font, radius, shadow, spacing } from "@/constants/ui";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

// Mise en page commune connexion / inscription :
// bandeau violet avec le logo, puis le formulaire dans une carte.
export function AuthScreen({ title, subtitle, children, footer }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={[styles.hero, { paddingTop: insets.top + 48 }]}>
          {/* Cercles décoratifs */}
          <View style={[styles.bubble, styles.bubbleLarge]} />
          <View style={[styles.bubble, styles.bubbleSmall]} />

          <View style={styles.logo}>
            <Icon name="location" size={30} color={colors.primary} />
          </View>
          <Text style={styles.brand}>GeoPush</Text>
          <Text style={styles.tagline}>
            Vos rappels se déclenchent au bon endroit.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.form}>{children}</View>
        </View>

        {footer && <View style={styles.footer}>{footer}</View>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingBottom: 72,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: "hidden",
  },
  bubble: {
    position: "absolute",
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  bubbleLarge: { width: 260, height: 260, top: -90, right: -80 },
  bubbleSmall: { width: 140, height: 140, bottom: -50, left: -40 },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
    ...shadow(2),
  },
  brand: { ...font.title, color: colors.onPrimary },
  tagline: { fontSize: 16, color: "rgba(255,255,255,0.8)", marginTop: 6 },
  card: {
    marginTop: -44,
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadow(2),
  },
  title: { ...font.heading, color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: 4 },
  form: { gap: spacing.lg, marginTop: spacing.xl },
  footer: { marginTop: spacing.xl, alignItems: "center" },
});
