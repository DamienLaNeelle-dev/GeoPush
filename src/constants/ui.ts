// Design system GeoPush : couleurs, rayons, espacements et ombres partagés
// par tous les écrans. Modifier ici change toute l'appli.
import { Platform, ViewStyle } from "react-native";

export const colors = {
  // Marque
  primary: "#5B4BDB",
  primaryDark: "#4335B8",
  primarySoft: "#EEEBFF",
  primaryMuted: "#B9B1F2",

  // Surfaces
  background: "#F6F5FB",
  surface: "#FFFFFF",
  surfaceMuted: "#F1F0F7",
  border: "#E7E5F0",

  // Texte
  text: "#17152B",
  textMuted: "#6B6880",
  textSubtle: "#9A97AC",
  onPrimary: "#FFFFFF",

  // États
  success: "#2E9E5B",
  successSoft: "#E3F5EA",
  danger: "#E5484D",
  dangerSoft: "#FDECEC",
  warning: "#C77700",
  warningSoft: "#FFF4DE",
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const font = {
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  heading: { fontSize: 20, fontWeight: "700", letterSpacing: -0.2 },
  subheading: { fontSize: 16, fontWeight: "600" },
  body: { fontSize: 15 },
  caption: { fontSize: 13 },
  overline: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
} as const;

// Ombre douce pour les cartes et boutons flottants
export const shadow = (elevation: 1 | 2 | 3 = 1): ViewStyle =>
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#2A1F7A",
      shadowOpacity: 0.06 + elevation * 0.03,
      shadowRadius: 6 + elevation * 4,
      shadowOffset: { width: 0, height: 2 + elevation * 2 },
    },
    default: { elevation: elevation * 2 },
  }) ?? {};
