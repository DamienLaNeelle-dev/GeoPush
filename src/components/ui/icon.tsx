import { SymbolView } from "expo-symbols";
import { Text } from "react-native";

import { colors } from "@/constants/ui";

// Icônes natives : SF Symbols sur iOS, Material Symbols sur Android.
const ICONS = {
  add: { ios: "plus", android: "add" },
  back: { ios: "chevron.left", android: "arrow_back" },
  bell: { ios: "bell.fill", android: "notifications" },
  check: { ios: "checkmark", android: "check" },
  chevronRight: { ios: "chevron.right", android: "chevron_right" },
  close: { ios: "xmark", android: "close" },
  directions: {
    ios: "arrow.triangle.turn.up.right.diamond.fill",
    android: "directions",
  },
  lock: { ios: "lock.fill", android: "lock" },
  location: { ios: "location.fill", android: "location_on" },
  locationBackground: { ios: "location.circle.fill", android: "share_location" },
  logout: { ios: "rectangle.portrait.and.arrow.right", android: "logout" },
  mail: { ios: "envelope.fill", android: "mail" },
  map: { ios: "map.fill", android: "map" },
  myLocation: { ios: "location.north.circle.fill", android: "my_location" },
  pin: { ios: "mappin.and.ellipse", android: "pin_drop" },
  radius: { ios: "scope", android: "radar" },
  search: { ios: "magnifyingglass", android: "search" },
  settings: { ios: "gearshape.fill", android: "settings" },
  sparkles: { ios: "sparkles", android: "auto_awesome" },
  store: { ios: "storefront.fill", android: "storefront" },
  trash: { ios: "trash", android: "delete" },
} as const;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 20, color = colors.text }: Props) {
  const { ios, android } = ICONS[name];
  return (
    <SymbolView
      name={{ ios, android, web: android }}
      size={size}
      tintColor={color}
      // Si le symbole n'existe pas sur l'appareil, on affiche un point discret
      fallback={<Text style={{ color, fontSize: size * 0.6 }}>•</Text>}
    />
  );
}
