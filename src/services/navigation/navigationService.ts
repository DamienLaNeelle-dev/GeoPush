import { Linking } from "react-native";

export const openDirections = (lat: number, lon: number, label?: string) => {
  const q = label ? `&q=${encodeURIComponent(label)}` : "";
  return Linking.openURL(
    `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=w${q}`,
  );
};
