import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
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
      {checkpoints.map((c) => {
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
  row: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, gap: 4 },
  rowDone: { backgroundColor: "#f0fdf4", borderColor: "#22c55e" },
  rowNext: { borderColor: "#000" },
  rowTitle: { fontWeight: "600" },
  complete: { fontSize: 16, fontWeight: "600", color: "#16a34a" },
  button: { backgroundColor: "#000", borderRadius: 6, padding: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
