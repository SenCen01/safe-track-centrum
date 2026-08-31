import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Image, ScrollView } from "react-native";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { colors, fonts, radius } from "../lib/theme";
import type { ShiftsStackParamList } from "../lib/navigation";

type Props = NativeStackScreenProps<ShiftsStackParamList, "IncidentReport">;

// Description + optional photo, submitted together as one report — replaces
// the previous two-step "log text, then attach a photo afterward" flow.
export function IncidentReportScreen({ route, navigation }: Props) {
  const { shiftId, patrolId } = route.params;
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickPhoto(source: "camera" | "library") {
    setError(null);
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError("Permission denied — can't attach a photo.");
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

    if (result.canceled || !result.assets?.[0]) return;
    setPhoto(result.assets[0]);
  }

  async function handleSubmit() {
    if (!description.trim()) {
      setError("Please describe what happened.");
      return;
    }
    setBusy(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("log_incident", {
      p_shift_id: shiftId,
      p_description: description.trim(),
      p_client_incident_id: Crypto.randomUUID(),
      p_occurred_at: new Date().toISOString(),
      p_patrol_id: patrolId,
    });

    if (rpcError) {
      setBusy(false);
      setError(rpcError.message);
      return;
    }

    const incidentId = (data as { id: string }).id;

    // The report itself is already recorded above — a failed photo upload
    // must never read as "the incident report failed".
    if (photo) {
      try {
        const response = await fetch(photo.uri);
        const arrayBuffer = await response.arrayBuffer();
        const ext = photo.fileName?.split(".").pop() ?? "jpg";
        const path = `${incidentId}/${Crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("incident-photos")
          .upload(path, arrayBuffer, { contentType: photo.mimeType ?? "image/jpeg" });

        if (!uploadError) {
          await supabase.rpc("attach_incident_photo", {
            p_incident_id: incidentId,
            p_storage_path: path,
          });
        }
      } catch {
        // Best-effort — see comment above.
      }
    }

    setBusy(false);
    navigation.goBack();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Report an Incident</Text>
      {patrolId && <Text style={styles.hint}>This will be linked to your current patrol.</Text>}

      <TextInput
        style={styles.textArea}
        placeholder="What happened?"
        placeholderTextColor={colors.muted}
        value={description}
        onChangeText={setDescription}
        multiline
        testID="incident-description-input"
      />

      {photo ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: photo.uri }} style={styles.preview} />
          <Pressable onPress={() => setPhoto(null)} testID="incident-remove-photo">
            <Text style={styles.link}>Remove photo</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.photoButtons}>
          <Pressable style={styles.secondaryButton} onPress={() => pickPhoto("camera")} testID="incident-take-photo">
            <Text style={styles.secondaryButtonText}>Take Photo</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => pickPhoto("library")} testID="incident-choose-photo">
            <Text style={styles.secondaryButtonText}>Choose Photo</Text>
          </Pressable>
        </View>
      )}
      <Text style={styles.optionalHint}>Photo is optional.</Text>

      {error && (
        <Text style={styles.error} testID="incident-error">
          {error}
        </Text>
      )}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={busy} testID="incident-submit-button">
        <Text style={styles.buttonText}>{busy ? "Submitting…" : "Submit Report"}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.goBack()} testID="incident-cancel-button">
        <Text style={styles.link}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 14 },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  textArea: {
    fontFamily: fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 100,
    backgroundColor: colors.surface,
    color: colors.text,
    textAlignVertical: "top",
  },
  photoButtons: { flexDirection: "row", gap: 10 },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: { fontFamily: fonts.bodyMedium, color: colors.brandDark },
  optionalHint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: -6 },
  previewWrap: { gap: 8 },
  preview: { width: "100%", height: 200, borderRadius: radius.md },
  link: { fontFamily: fonts.bodyMedium, color: colors.brand, textAlign: "center" },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 13 },
  button: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 14, alignItems: "center" },
  buttonText: { fontFamily: fonts.bodyBold, color: "#fff", fontSize: 15 },
});
