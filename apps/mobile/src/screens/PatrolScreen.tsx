import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Crypto from "expo-crypto";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { colors, fonts, radius } from "../lib/theme";
import { useLocationTracking } from "../lib/useLocationTracking";
import { TrackingIndicator } from "../components/TrackingIndicator";
import { StatusBadge } from "../components/StatusBadge";
import type { Checkpoint, CheckpointScan, Patrol } from "../lib/types";
import type { ShiftsStackParamList } from "../lib/navigation";

type Props = NativeStackScreenProps<ShiftsStackParamList, "Patrol">;

export function PatrolScreen({ route, navigation }: Props) {
  const { patrolId, shiftId } = route.params;
  const [patrol, setPatrol] = useState<Patrol | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [scans, setScans] = useState<CheckpointScan[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // A Patrol only exists while its Shift is in_progress, so tracking is
  // always active here.
  const trackingStatus = useLocationTracking(shiftId, true);

  // Debounces the camera re-detecting the same code many times a second
  // while it's held in frame — without this, a single physical scan would
  // fire the RPC repeatedly (harmless since the second call just sees the
  // checkpoint is no longer "next" and errors, but it's a noisy/wasteful
  // stream of requests and error flashes for one real scan).
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  const load = useCallback(async () => {
    const { data: patrolData } = await supabase
      .from("patrols")
      .select("id, shift_id, route_id, status")
      .eq("id", patrolId)
      .single();

    if (!patrolData) return;
    setPatrol(patrolData as Patrol);

    const [{ data: checkpointData }, { data: scanData }] = await Promise.all([
      supabase
        .from("checkpoints")
        .select("id, route_id, sequence_number, name, qr_code")
        .eq("route_id", patrolData.route_id)
        .order("sequence_number"),
      supabase
        .from("checkpoint_scans")
        .select("id, checkpoint_id, sequence_number")
        .eq("patrol_id", patrolId)
        .order("sequence_number"),
    ]);

    setCheckpoints((checkpointData as Checkpoint[]) ?? []);
    setScans((scanData as CheckpointScan[]) ?? []);
  }, [patrolId]);

  useEffect(() => {
    load();
  }, [load]);

  const nextSequence = scans.length + 1;
  const isComplete = patrol?.status === "complete";
  const nextCheckpoint = checkpoints.find((c) => c.sequence_number === nextSequence);

  async function handleScan(checkpoint: Checkpoint) {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("scan_checkpoint", {
      p_patrol_id: patrolId,
      p_checkpoint_id: checkpoint.id,
      p_client_scan_id: Crypto.randomUUID(),
      p_scanned_at: new Date().toISOString(),
    });
    setBusy(false);

    if (rpcError) {
      if (rpcError.message.includes("checkpoint_out_of_order")) {
        const expected = checkpoints.find((c) => c.sequence_number === nextSequence);
        setError(`Go back to ${expected?.name ?? "the next checkpoint"}.`);
      } else {
        setError(rpcError.message);
      }
      return;
    }

    await load();
  }

  function handleBarcodeScanned({ data }: BarcodeScanningResult) {
    if (busy || isComplete) return;

    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.code === data && now - lastScanRef.current.at < 2000) {
      return;
    }
    lastScanRef.current = { code: data, at: now };

    const checkpoint = checkpoints.find((c) => c.qr_code === data);
    if (!checkpoint) {
      setError("That QR code doesn't belong to this site.");
      return;
    }
    handleScan(checkpoint);
  }

  if (!patrol) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.goBack()} testID="patrol-back-button">
        <Text style={styles.link}>← Back to Shift</Text>
      </Pressable>
      <View>
        <Text style={styles.title}>Patrol</Text>
        <StatusBadge status={patrol.status} />
      </View>

      <TrackingIndicator status={trackingStatus} />

      {error && (
        <Text style={styles.error} testID="patrol-error">
          {error}
        </Text>
      )}

      {!isComplete && !manualMode && (
        <View style={styles.cameraWrap}>
          {!permission ? (
            <Text style={styles.body}>Loading camera…</Text>
          ) : !permission.granted ? (
            <View style={styles.permissionBox}>
              <Text style={styles.body}>Camera access is needed to scan checkpoint QR codes.</Text>
              <Pressable style={styles.button} onPress={requestPermission} testID="grant-permission-button">
                <Text style={styles.buttonText}>Grant Camera Permission</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {nextCheckpoint && (
                <View style={styles.nextBanner} testID="next-checkpoint-banner">
                  <Text style={styles.nextBannerLabel}>NEXT</Text>
                  <Text style={styles.nextBannerText}>{nextCheckpoint.name}</Text>
                </View>
              )}
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={handleBarcodeScanned}
                testID="camera-view"
              />
            </>
          )}
          <Pressable onPress={() => setManualMode(true)} testID="manual-mode-toggle">
            <Text style={styles.link}>Having trouble scanning? Enter manually</Text>
          </Pressable>
        </View>
      )}

      {(manualMode || isComplete) &&
        checkpoints.map((c) => {
          const done = scans.some((s) => s.checkpoint_id === c.id);
          const isNext = !done && c.sequence_number === nextSequence;
          return (
            <Pressable
              key={c.id}
              style={[styles.row, done && styles.rowDone, isNext && styles.rowNext]}
              onPress={() => isNext && !busy && handleScan(c)}
              disabled={!isNext || busy}
              testID={`checkpoint-${c.id}`}
            >
              <Text style={styles.rowTitle}>
                {c.sequence_number}. {c.name}
              </Text>
              <Text style={styles.body}>{done ? "✓ Scanned" : isNext ? "Tap to scan" : "Not yet"}</Text>
            </Pressable>
          );
        })}

      {manualMode && !isComplete && (
        <Pressable onPress={() => setManualMode(false)} testID="camera-mode-toggle">
          <Text style={styles.link}>Use camera instead</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.secondaryButton}
        onPress={() => navigation.navigate("IncidentReport", { shiftId, patrolId })}
        testID="patrol-report-incident-button"
      >
        <Text style={styles.secondaryButtonText}>Report Incident</Text>
      </Pressable>

      {isComplete && (
        <>
          <Text style={styles.complete}>Patrol complete!</Text>
          <Pressable style={styles.button} onPress={() => navigation.goBack()} testID="patrol-done-button">
            <Text style={styles.buttonText}>Back to Shift</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  link: { fontFamily: fonts.bodyMedium, color: colors.brand },
  error: { fontFamily: fonts.body, color: colors.danger },
  cameraWrap: { gap: 8 },
  nextBanner: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  nextBannerLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, color: colors.mint },
  nextBannerText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: "#fff" },
  camera: { width: "100%", height: 320, borderRadius: radius.lg, overflow: "hidden" },
  permissionBox: { gap: 8, alignItems: "flex-start" },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    gap: 4,
    backgroundColor: colors.surface,
  },
  rowDone: { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  rowNext: { borderColor: colors.brand, borderWidth: 2 },
  rowTitle: { fontFamily: fonts.bodySemiBold, color: colors.text },
  complete: { fontFamily: fonts.display, fontSize: 17, color: colors.brand },
  button: { backgroundColor: colors.brand, borderRadius: radius.md, padding: 14, alignItems: "center" },
  buttonText: { fontFamily: fonts.bodyBold, color: "#fff", fontSize: 15 },
  secondaryButton: { backgroundColor: colors.mint, borderRadius: radius.md, padding: 14, alignItems: "center" },
  secondaryButtonText: { fontFamily: fonts.bodySemiBold, color: colors.brandDark, fontSize: 15 },
});
