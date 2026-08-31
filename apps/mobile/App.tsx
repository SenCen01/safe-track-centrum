import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./src/lib/supabase";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ShiftsScreen } from "./src/screens/ShiftsScreen";
import { ShiftDetailScreen } from "./src/screens/ShiftDetailScreen";
import { PatrolScreen } from "./src/screens/PatrolScreen";

type Screen =
  | { name: "shifts" }
  | { name: "shiftDetail"; shiftId: string }
  | { name: "patrol"; patrolId: string; shiftId: string };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [screen, setScreen] = useState<Screen>({ name: "shifts" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      // Only reset to the shifts list on a genuine new sign-in — this event
      // also fires on automatic token refresh, which must NOT kick a guard
      // back to the shifts list mid-patrol.
      if (event === "SIGNED_IN") {
        setScreen({ name: "shifts" });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (checkingSession) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <LoginScreen />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {screen.name === "shifts" && (
        <ShiftsScreen
          onSelectShift={(shiftId) => setScreen({ name: "shiftDetail", shiftId })}
          onSignOut={() => supabase.auth.signOut()}
        />
      )}
      {screen.name === "shiftDetail" && (
        <ShiftDetailScreen
          shiftId={screen.shiftId}
          onBack={() => setScreen({ name: "shifts" })}
          onOpenPatrol={(patrolId) => setScreen({ name: "patrol", patrolId, shiftId: screen.shiftId })}
        />
      )}
      {screen.name === "patrol" && (
        <PatrolScreen
          patrolId={screen.patrolId}
          onDone={() => setScreen({ name: "shiftDetail", shiftId: screen.shiftId })}
        />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  // Crude safe-area stand-in (no react-native-safe-area-context wired yet)
  // — fine for this pass, worth adding once we're building on real devices.
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
