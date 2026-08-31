import { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { colors, fonts, radius } from "../lib/theme";
import { useLocationTracking } from "../lib/useLocationTracking";
import { TrackingIndicator } from "../components/TrackingIndicator";
import { StatusBadge } from "../components/StatusBadge";
import type { Shift, Patrol } from "../lib/types";
import type { ShiftsStackParamList } from "../lib/navigation";

type Props = NativeStackScreenProps<ShiftsStackParamList, "ShiftDetail">;

export function ShiftDetailScreen({ route, navigation }: Props) {
  const { shiftId } = route.params;
  const [shift, setShift] = useState<Shift | null>(null);
  const [openPatrol, setOpenPatrol] = useState<Patrol | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trackingStatus = useLocationTracking(shiftId, shift?.status === "in_progress");

  const load = useCallback(async () => {
    const { data: shiftData } = await supabase
      .from("shifts")
      .select("id, site_id, scheduled_start, scheduled_end, actual_start, actual_end, status, sites(name, address)")
      .eq("id", shiftId)
      .single();
    setShift(shiftData as unknown as Shift);

    const { data: patrolData } = await supabase
      .from("patrols")
      .select("id, shift_id, route_id, status")
      .eq("shift_id", shiftId)
      .eq("status", "in_progress")
      .maybeSingle();
    setOpenPatrol(patrolData as Patrol | null);
  }, [shiftId]);

  // Refreshes whenever this screen regains focus — covers returning from
  // Patrol or the Incident report, not just the initial mount.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleClockIn() {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("start_shift", { p_shift_id: shiftId });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await load();
  }

  async function handleStartPatrol() {
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("start_patrol", { p_shift_id: shiftId });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    const patrol = data as unknown as Patrol;
    navigation.navigate("Patrol", { shiftId, patrolId: patrol.id });
  }

  const doEndShift = useCallback(
    async (confirmIncomplete: boolean) => {
      setBusy(true);
      setError(null);
      const { error: rpcError } = await supabase.rpc("end_shift", {
        p_shift_id: shiftId,
        p_confirm_incomplete: confirmIncomplete,
      });
      setBusy(false);

      if (rpcError) {
        if (rpcError.message.includes("patrol_not_finished")) {
          Alert.alert("Patrol not finished", "This patrol isn't finished. End shift anyway?", [
            { text: "Cancel", style: "cancel" },
            { text: "End shift", style: "destructive", onPress: () => doEndShift(true) },
          ]);
          return;
        }
        setError(rpcError.message);
        return;
      }

      await load();
    },
    [shiftId, load],
  );

  if (!shift) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.goBack()} testID="back-button">
        <Text style={styles.link}>← My Shifts</Text>
      </Pressable>

      <View>
        <Text style={styles.title}>{shift.sites?.name}</Text>
        <Text style={styles.body}>{shift.sites?.address}</Text>
        <Text style={styles.body}>
          {new Date(shift.scheduled_start).toLocaleString()} – {new Date(shift.scheduled_end).toLocaleString()}
        </Text>
        <StatusBadge status={shift.status} />
      </View>

      {shift.status === "in_progress" && <TrackingIndicator status={trackingStatus} />}

      {error && (
        <Text style={styles.error} testID="shift-error">
          {error}
        </Text>
      )}

      {shift.status === "scheduled" && (
        <Pressable style={styles.button} onPress={handleClockIn} disabled={busy} testID="clock-in-button">
          <Text style={styles.buttonText}>{busy ? "Working…" : "Clock In"}</Text>
        </Pressable>
      )}

      {shift.status === "in_progress" && (
        <>
          {openPatrol ? (
            <Pressable
              style={styles.button}
              onPress={() => navigation.navigate("Patrol", { shiftId, patrolId: openPatrol.id })}
              testID="continue-patrol-button"
            >
              <Text style={styles.buttonText}>Continue Patrol</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.button} onPress={handleStartPatrol} disabled={busy} testID="start-patrol-button">
              <Text style={styles.buttonText}>{busy ? "Working…" : "Start Patrol"}</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("IncidentReport", { shiftId, patrolId: openPatrol?.id ?? null })}
            testID="report-incident-button"
          >
            <Text style={styles.secondaryButtonText}>Report Incident</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, styles.dangerButton]}
            onPress={() => doEndShift(false)}
            disabled={busy}
            testID="clock-out-button"
          >
            <Text style={styles.dangerButtonText}>{busy ? "Working…" : "Clock Out"}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { gap: 16, padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  link: { fontFamily: fonts.bodyMedium, color: colors.brand },
  button: { backgroundColor: colors.brand, borderRadius: radius.md, padding: 14, alignItems: "center" },
  buttonText: { fontFamily: fonts.bodyBold, color: "#fff", fontSize: 15 },
  secondaryButton: { backgroundColor: colors.mint, borderRadius: radius.md, padding: 14, alignItems: "center" },
  secondaryButtonText: { fontFamily: fonts.bodySemiBold, color: colors.brandDark, fontSize: 15 },
  dangerButton: { backgroundColor: "#fee2e2" },
  dangerButtonText: { fontFamily: fonts.bodySemiBold, color: colors.danger, fontSize: 15 },
  error: { fontFamily: fonts.body, color: colors.danger },
});
