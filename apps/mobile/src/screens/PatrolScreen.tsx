import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Crypto from "expo-crypto";
import { supabase } from "../lib/supabase";
import type { Checkpoint, CheckpointScan, Patrol } from "../lib/types";

type Props = {
  patrolId: string;
  onDone: () => void;
};

export function PatrolScreen({ patrolId, onDone }: Props) {
  const [patrol, setPatrol] = useState<Patrol | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [scans, setScans] = useState<CheckpointScan[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

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
      <View style={styles.container}>
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Patrol</Text>
      <Text style={styles.status} testID="patrol-status">
        {patrol.status}
      </Text>
      {error && (
        <Text style={styles.error} testID="patrol-error">
          {error}
        </Text>
      )}

      {!isComplete && !manualMode && (
        <View style={styles.cameraWrap}>
          {!permission ? (
            <Text>Loading camera…</Text>
          ) : !permission.granted ? (
            <View style={styles.permissionBox}>
              <Text>Camera access is needed to scan checkpoint QR codes.</Text>
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
              <Text>{done ? "✓ Scanned" : isNext ? "Tap to scan" : "Not yet"}</Text>
            </Pressable>
          );
        })}

      {manualMode && !isComplete && (
        <Pressable onPress={() => setManualMode(false)} testID="camera-mode-toggle">
          <Text style={styles.link}>Use camera instead</Text>
        </Pressable>
      )}

      {isComplete && (
        <>
          <Text style={styles.complete}>Patrol complete!</Text>
          <Pressable style={styles.button} onPress={onDone} testID="patrol-done-button">
            <Text style={styles.buttonText}>Back to Shift</Text>
          </Pressable>
        </>
      )}
      {!isComplete && (
        <Pressable onPress={onDone} testID="patrol-back-button">
          <Text style={styles.link}>← Back to Shift</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "600" },
  status: { color: "#6b7280", textTransform: "uppercase", fontSize: 12 },
  link: { color: "#2563eb" },
  error: { color: "#dc2626" },
  cameraWrap: { gap: 8 },
  camera: { width: "100%", height: 320, borderRadius: 8, overflow: "hidden" },
  permissionBox: { gap: 8, alignItems: "flex-start" },
  row: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, gap: 4 },
  rowDone: { backgroundColor: "#f0fdf4", borderColor: "#22c55e" },
  rowNext: { borderColor: "#000" },
  rowTitle: { fontWeight: "600" },
  complete: { fontSize: 16, fontWeight: "600", color: "#16a34a" },
  button: { backgroundColor: "#000", borderRadius: 6, padding: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
