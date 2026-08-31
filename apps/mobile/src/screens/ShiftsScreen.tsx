import { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { colors, fonts, radius } from "../lib/theme";
import { StatusBadge } from "../components/StatusBadge";
import type { Shift } from "../lib/types";

type Props = {
  onSelectShift: (shiftId: string) => void;
  onSignOut: () => void;
};

export function ShiftsScreen({ onSelectShift, onSignOut }: Props) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => onSelectShift(item.id)} testID={`shift-row-${item.id}`}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.sites?.name ?? "Unknown site"}</Text>
              <Text style={styles.rowSubtitle}>{new Date(item.scheduled_start).toLocaleString()}</Text>
            </View>
            <StatusBadge status={item.status} />
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No shifts yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  link: { fontFamily: fonts.bodyMedium, color: colors.brand },
  list: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  rowTitle: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  rowSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  empty: { fontFamily: fonts.body, color: colors.muted, textAlign: "center", marginTop: 40 },
});
