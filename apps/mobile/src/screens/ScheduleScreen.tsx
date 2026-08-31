import { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { Calendar } from "react-native-calendars";
import { supabase } from "../lib/supabase";
import { colors, fonts, radius } from "../lib/theme";
import { StatusBadge } from "../components/StatusBadge";
import type { Shift } from "../lib/types";

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function ScheduleScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);

  useFocusEffect(
    useCallback(() => {
      supabase
        .from("shifts")
        .select("id, site_id, scheduled_start, scheduled_end, actual_start, actual_end, status, sites(name, address)")
        .order("scheduled_start")
        .then(({ data }) => {
          if (data) setShifts(data as unknown as Shift[]);
        });
    }, []),
  );

  const markedDates = useMemo(() => {
    const marks: Record<string, { marked: true; dotColor: string }> = {};
    for (const shift of shifts) {
      marks[dateKey(shift.scheduled_start)] = { marked: true, dotColor: colors.brand };
    }
    return marks;
  }, [shifts]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Schedule</Text>
      <View style={styles.calendarCard}>
        <Calendar
          markedDates={markedDates}
          theme={{
            todayTextColor: colors.brand,
            arrowColor: colors.brand,
            dotColor: colors.brand,
            selectedDayBackgroundColor: colors.brand,
            textDayFontFamily: fonts.body,
            textMonthFontFamily: fonts.bodyBold,
            textDayHeaderFontFamily: fonts.bodyMedium,
            dayTextColor: colors.text,
            monthTextColor: colors.text,
          }}
        />
      </View>

      <Text style={styles.sectionTitle}>Upcoming</Text>
      {shifts.map((s) => (
        <View key={s.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{s.sites?.name ?? "Unknown site"}</Text>
            <Text style={styles.rowSubtitle}>{new Date(s.scheduled_start).toLocaleString()}</Text>
          </View>
          <StatusBadge status={s.status} />
        </View>
      ))}
      {shifts.length === 0 && <Text style={styles.empty}>No shifts scheduled.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 12, paddingBottom: 32 },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  calendarCard: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text, marginTop: 8 },
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
  empty: { fontFamily: fonts.body, color: colors.muted, textAlign: "center", marginTop: 20 },
});
