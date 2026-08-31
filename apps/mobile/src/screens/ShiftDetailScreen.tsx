import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, Alert, ScrollView } from "react-native";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import type { Shift, Patrol } from "../lib/types";

type Props = {
  shiftId: string;
  onBack: () => void;
  onOpenPatrol: (patrolId: string) => void;
};

export function ShiftDetailScreen({ shiftId, onBack, onOpenPatrol }: Props) {
  const [shift, setShift] = useState<Shift | null>(null);
  const [openPatrol, setOpenPatrol] = useState<Patrol | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incidentText, setIncidentText] = useState("");
  const [incidentStatus, setIncidentStatus] = useState<string | null>(null);
  const [lastIncidentId, setLastIncidentId] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);

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

  useEffect(() => {
    load();
  }, [load]);

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
    onOpenPatrol(patrol.id);
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
        // Plain `RAISE EXCEPTION 'patrol_not_finished'` (no `using detail`) —
        // supabase-js surfaces the raised message verbatim in .message.
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

  async function handleLogIncident() {
    if (!incidentText.trim()) return;
    setBusy(true);
    setIncidentStatus(null);
    setPhotoStatus(null);
    const { data, error: rpcError } = await supabase.rpc("log_incident", {
      p_shift_id: shiftId,
      p_description: incidentText.trim(),
      p_client_incident_id: Crypto.randomUUID(),
      p_occurred_at: new Date().toISOString(),
      p_patrol_id: openPatrol?.id ?? null,
    });
    setBusy(false);
    if (rpcError) {
      setIncidentStatus(`Error: ${rpcError.message}`);
      return;
    }
    setIncidentText("");
    setIncidentStatus("Incident logged.");
    setLastIncidentId((data as { id: string } | null)?.id ?? null);
  }

  // The incident itself is already recorded via log_incident regardless of
  // what happens here — a failed photo upload must never read as "the
  // incident report failed", it's an optional attachment on top of it.
  async function handleAddPhoto(source: "camera" | "library") {
    if (!lastIncidentId) return;

    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setPhotoStatus("Permission denied — can't attach a photo.");
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setPhotoUploading(true);
    setPhotoStatus(null);
    try {
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const ext = asset.fileName?.split(".").pop() ?? "jpg";
      const path = `${lastIncidentId}/${Crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("incident-photos")
        .upload(path, arrayBuffer, { contentType: asset.mimeType ?? "image/jpeg" });

      if (uploadError) {
        setPhotoStatus(`Photo upload failed: ${uploadError.message}`);
        return;
      }

      const { error: attachError } = await supabase.rpc("attach_incident_photo", {
        p_incident_id: lastIncidentId,
        p_storage_path: path,
      });

      if (attachError) {
        setPhotoStatus(`Photo uploaded but couldn't be linked: ${attachError.message}`);
        return;
      }

      setPhotoStatus("Photo attached.");
    } catch (err) {
      setPhotoStatus(`Photo upload failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPhotoUploading(false);
    }
  }

  if (!shift) {
    return (
      <View style={styles.container}>
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} testID="back-button">
        <Text style={styles.link}>← My Shifts</Text>
      </Pressable>
      <Text style={styles.title}>{shift.sites?.name}</Text>
      <Text>{shift.sites?.address}</Text>
      <Text>
        {new Date(shift.scheduled_start).toLocaleString()} – {new Date(shift.scheduled_end).toLocaleString()}
      </Text>
      <Text style={styles.status} testID="shift-status">
        {shift.status}
      </Text>

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
              onPress={() => onOpenPatrol(openPatrol.id)}
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
            style={[styles.button, styles.secondaryButton]}
            onPress={() => doEndShift(false)}
            disabled={busy}
            testID="clock-out-button"
          >
            <Text style={styles.buttonText}>{busy ? "Working…" : "Clock Out"}</Text>
          </Pressable>
        </>
      )}

      <View style={styles.incidentSection}>
        <Text style={styles.sectionTitle}>Log an Incident</Text>
        <TextInput
          style={styles.textArea}
          placeholder="What happened?"
          value={incidentText}
          onChangeText={setIncidentText}
          multiline
          testID="incident-input"
        />
        <Pressable style={styles.button} onPress={handleLogIncident} disabled={busy} testID="log-incident-button">
          <Text style={styles.buttonText}>Log Incident</Text>
        </Pressable>
        {incidentStatus && <Text testID="incident-status">{incidentStatus}</Text>}

        {lastIncidentId && (
          <View style={styles.photoRow}>
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => handleAddPhoto("camera")}
              disabled={photoUploading}
              testID="add-photo-camera-button"
            >
              <Text style={styles.buttonText}>{photoUploading ? "Uploading…" : "Take Photo"}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => handleAddPhoto("library")}
              disabled={photoUploading}
              testID="add-photo-library-button"
            >
              <Text style={styles.buttonText}>{photoUploading ? "Uploading…" : "Choose Photo"}</Text>
            </Pressable>
          </View>
        )}
        {photoStatus && <Text testID="photo-status">{photoStatus}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 16, padding: 16 },
  title: { fontSize: 20, fontWeight: "600" },
  status: { color: "#6b7280", textTransform: "uppercase", fontSize: 12 },
  link: { color: "#2563eb" },
  button: { backgroundColor: "#000", borderRadius: 6, padding: 12, alignItems: "center" },
  secondaryButton: { backgroundColor: "#6b7280" },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#dc2626" },
  incidentSection: { gap: 8, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 16 },
  sectionTitle: { fontWeight: "600" },
  textArea: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 10, minHeight: 60 },
  photoRow: { flexDirection: "row", gap: 8 },
});
