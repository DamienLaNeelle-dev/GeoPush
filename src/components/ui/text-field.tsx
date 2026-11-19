import { useState } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

import { Icon, IconName } from "@/components/ui/icon";
import { colors, radius } from "@/constants/ui";

type Props = TextInputProps & {
  label?: string;
  icon?: IconName;
};

// Champ de saisie avec libellé, icône et bordure colorée au focus.
export function TextField({ label, icon, style, onFocus, onBlur, ...props }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.field, focused && styles.fieldFocused]}>
        {icon && (
          <Icon
            name={icon}
            size={18}
            color={focused ? colors.primary : colors.textSubtle}
          />
        )}
        <TextInput
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text },
  field: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fieldFocused: { borderColor: colors.primary, backgroundColor: "#FCFBFF" },
  input: { flex: 1, height: "100%", fontSize: 16, color: colors.text },
});
