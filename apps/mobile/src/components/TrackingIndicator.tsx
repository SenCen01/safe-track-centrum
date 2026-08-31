import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { colors, fonts, radius } from "../lib/theme";
import type { TrackingStatus } from "../lib/useLocationTracking";

// Trust/transparency requirement, not just a technical detail: a guard must
// always be able to see, at a glance, whether their location is currently
// being shared — this stays visible for the whole active shift, not a
// one-time toast.
export function TrackingIndicator({ status }: { status: TrackingStatus }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status !== "tracking") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [status, pulse]);

  if (status === "idle") return null;

  if (status === "denied") {
    return (
      <View style={[styles.container, styles.denied]} testID="tracking-indicator-denied">
        <Text style={styles.deniedText}>
          Location access is off — your Operations Manager won&apos;t see your position this shift.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="tracking-indicator">
      <Animated.View style={[styles.dot, { opacity: pulse }]} />
      <Text style={styles.text}>Your location is being shared with your Operations Manager</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandLight },
  text: { fontFamily: fonts.body, fontSize: 12, color: colors.brandDark, flexShrink: 1 },
  denied: { backgroundColor: colors.warningBg },
  deniedText: { fontFamily: fonts.body, fontSize: 12, color: colors.warning, flexShrink: 1 },
});
