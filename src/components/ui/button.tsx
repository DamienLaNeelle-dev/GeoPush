import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

import { Icon, IconName } from "@/components/ui/icon";
import { colors, radius, shadow } from "@/constants/ui";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const VARIANTS: Record<
  Variant,
  { background: string; pressed: string; text: string; border?: string }
> = {
  primary: {
    background: colors.primary,
    pressed: colors.primaryDark,
    text: colors.onPrimary,
  },
  secondary: {
    background: colors.primarySoft,
    pressed: "#E2DDFF",
    text: colors.primary,
  },
  ghost: {
    background: "transparent",
    pressed: colors.surfaceMuted,
    text: colors.primary,
  },
  danger: {
    background: colors.dangerSoft,
    pressed: "#FADADA",
    text: colors.danger,
  },
};

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  style,
}: Props) {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && !disabled && shadow(2),
        { backgroundColor: pressed ? v.pressed : v.background },
        loading && styles.loading,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <>
          {icon && (
            <Icon
              name={icon}
              size={18}
              color={disabled ? colors.textSubtle : v.text}
            />
          )}
          <Text
            style={[
              styles.text,
              { color: disabled ? colors.textSubtle : v.text },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loading: { opacity: 0.7 },
  // Désactivé : gris, pour qu'on ne le confonde pas avec un bouton actif
  disabled: { backgroundColor: colors.surfaceMuted },
  text: { fontSize: 16, fontWeight: "700" },
});
