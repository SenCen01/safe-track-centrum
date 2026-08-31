import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { supabase } from "../lib/supabase";
import type { Shift } from "../lib/types";

type Props = {
  onSelectShift: (shiftId: string) => void;
  onSignOut: () => void;
};

export function ShiftsScreen({ onSelectShift, onSignOut }: Props) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    // RLS already scopes this to the signed-in Guard's own shifts.
    const { data, error } = await supabase
      .from("shifts")
      .select("id, site_id, scheduled_start, scheduled_end, actual_start, actual_end, status, sites(name, address)")
      .order("scheduled_start", { ascending: false });

    if (!error && data) {
      setShifts(data as unknown as Shift[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Shifts</Text>
        <Pressable onPress={onSignOut} testID="sign-out-button">
          <Text style={styles.link}>Sign out</Text>
        </Pressable>
      </View>
      <FlatList
        data={shifts}
        keyExtractor={(s) => s.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => onSelectShift(item.id)} testID={`shift-row-${item.id}`}>
            <Text style={styles.rowTitle}>{item.sites?.name ?? "Unknown site"}</Text>
            <Text>{new Date(item.scheduled_start).toLocaleString()}</Text>
            <Text style={styles.status}>{item.status}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No shifts yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "600" },
  link: { color: "#2563eb" },
  row: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 8, gap: 4 },
  rowTitle: { fontWeight: "600" },
  status: { color: "#6b7280", textTransform: "uppercase", fontSize: 12 },
  empty: { color: "#6b7280", textAlign: "center", marginTop: 24 },
});
