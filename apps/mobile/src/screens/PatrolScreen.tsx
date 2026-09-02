import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { colors, fonts, radius } from "../lib/theme";
import { useLocationTracking } from "../lib/useLocationTracking";
import { TrackingIndicator } from "../components/TrackingIndicator";
import { StatusBadge } from "../components/StatusBadge";
import type { Checkpoint, CheckpointScan, Patrol } from "../lib/types";
import type { ShiftsStackParamList } from "../lib/navigation";

type Props = NativeStackScreenProps<ShiftsStackParamList, "Patrol">;

// Two views: an overview (checklist — where you are, what's next) and a
// scanning view (camera, scoped to one specific checkpoint) entered by
// deliberately tapping into the next checkpoint. The camera is never just
// sitting open — it only appears once you've committed to scanning a
// specific checkpoint, and finishing (or cancelling) returns to the
// checklist automatically.
export function PatrolScreen({ route, navigation }: Props) {
  const { patrolId, shiftId } = route.params;
  const [patrol, setPatrol] = useState<Patrol | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [scans, setScans] = useState<CheckpointScan[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
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
        .select("id, checkpoint_id, sequence_number, photo_storage_path")
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

  // A checkpoint isn't "done" until its photo exists — the photo is
  // captured and uploaded first, then passed into scan_checkpoint as a
  // required argument, so there is no state where a scan gets recorded
  // without one. Single-tap camera capture, no gallery option: the guard
  // is standing at the checkpoint right now, this needs to be fast.
  async function completeCheckpoint(checkpoint: Checkpoint) {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Camera access is required to confirm this checkpoint with a photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (result.canceled || !result.assets?.[0]) {
        setError("Take a photo to confirm this checkpoint.");
        return;
      }
      const asset = result.assets[0];

      const clientScanId = Crypto.randomUUID();
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const ext = asset.fileName?.split(".").pop() ?? "jpg";
      const photoPath = `${patrolId}/${clientScanId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("checkpoint-photos")
        .upload(photoPath, arrayBuffer, { contentType: asset.mimeType ?? "image/jpeg" });

      if (uploadError) {
        setError("Photo upload failed — try again.");
        return;
      }

      const { error: rpcError } = await supabase.rpc("scan_checkpoint", {
        p_patrol_id: patrolId,
        p_checkpoint_id: checkpoint.id,
        p_client_scan_id: clientScanId,
        p_scanned_at: new Date().toISOString(),
        p_photo_storage_path: photoPath,
      });

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
      setScanning(false);
      setManualEntry(false);
    } finally {
      setBusy(false);
    }
  }

  function handleBarcodeScanned({ data }: BarcodeScanningResult) {
    if (busy || !scanning || manualEntry) return;

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
    if (!nextCheckpoint || checkpoint.id !== nextCheckpoint.id) {
      setError(`That's ${checkpoint.name} — you need ${nextCheckpoint?.name ?? "the next checkpoint"}.`);
      return;
    }
    completeCheckpoint(checkpoint);
  }

  function startScanning() {
    setError(null);
    setManualEntry(false);
    setScanning(true);
  }

  function cancelScanning() {
    if (busy) return;
    setError(null);
    setScanning(false);
    setManualEntry(false);
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

      {scanning && !isComplete && nextCheckpoint ? (
        <View style={styles.scanWrap}>
          <View style={styles.scanHeader}>
            <Text style={styles.scanHeaderLabel}>SCANNING</Text>
            <Text style={styles.scanHeaderName}>{nextCheckpoint.name}</Text>
          </View>

          {!manualEntry ? (
            <>
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
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={handleBarcodeScanned}
                  testID="camera-view"
                />
              )}
              <Text style={styles.hint}>Point your camera at the {nextCheckpoint.name} QR code.</Text>
              <Pressable onPress={() => setManualEntry(true)} testID="manual-mode-toggle">
                <Text style={styles.link}>QR damaged or unreadable? Confirm manually</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={styles.button}
              onPress={() => completeCheckpoint(nextCheckpoint)}
              disabled={busy}
              testID="manual-confirm-button"
            >
              <Text style={styles.buttonText}>
                {busy ? "Confirming…" : `Confirm ${nextCheckpoint.name} — Take Photo`}
              </Text>
            </Pressable>
          )}

          <Pressable onPress={cancelScanning} disabled={busy} testID="cancel-scan-button">
            <Text style={styles.link}>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {!isComplete && nextCheckpoint && (
            <Pressable style={styles.nextCard} onPress={startScanning} testID="scan-next-button">
              <Text style={styles.nextCardLabel}>NEXT CHECKPOINT</Text>
              <Text style={styles.nextCardName}>{nextCheckpoint.name}</Text>
              <Text style={styles.nextCardAction}>Tap to scan →</Text>
            </Pressable>
          )}

          {checkpoints.map((c) => {
            const scan = scans.find((s) => s.checkpoint_id === c.id) ?? null;
            const done = !!scan;
            const isNext = c.id === nextCheckpoint?.id;
            return (
              <View
                key={c.id}
                style={[styles.row, done && styles.rowDone, isNext && styles.rowNext]}
                testID={`checkpoint-${c.id}`}
              >
                <Text style={styles.rowTitle}>
                  {c.sequence_number}. {c.name}
                </Text>
                <Text style={styles.body}>{done ? "✓ Scanned · 📷 Photo" : isNext ? "Up next" : "Not yet"}</Text>
              </View>
            );
          })}
        </>
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
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: "center" },
  nextCard: {
    gap: 4,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  nextCardLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, color: colors.mint },
  nextCardName: { fontFamily: fonts.bodySemiBold, fontSize: 20, color: "#fff" },
  nextCardAction: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.mint },
  scanWrap: { gap: 10 },
  scanHeader: { alignItems: "center", gap: 2, marginBottom: 4 },
  scanHeaderLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, color: colors.muted },
  scanHeaderName: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
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
