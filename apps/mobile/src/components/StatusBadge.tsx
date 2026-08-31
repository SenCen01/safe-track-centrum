import { View, Text, StyleSheet } from "react-native";
import { fonts, radius } from "../lib/theme";

const VARIANTS: Record<string, { bg: string; fg: string }> = {
  scheduled: { bg: "#dbeafe", fg: "#1d4ed8" },
  in_progress: { bg: "#dcfce7", fg: "#15803d" },
  completed: { bg: "#f1f5f9", fg: "#475569" },
  complete: { bg: "#dcfce7", fg: "#15803d" },
  incomplete: { bg: "#fef3c7", fg: "#b45309" },
};

function label(status: string): string {
  return status
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export function StatusBadge({ status }: { status: string }) {
  const variant = VARIANTS[status] ?? VARIANTS.completed;
  return (
    <View style={[styles.badge, { backgroundColor: variant.bg }]}>
      <Text style={[styles.text, { color: variant.fg }]}>{label(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
  },
  text: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
