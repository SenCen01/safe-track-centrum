import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import { PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./src/lib/supabase";
import { colors, fonts } from "./src/lib/theme";
import type { ShiftsStackParamList } from "./src/lib/navigation";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ShiftsScreen } from "./src/screens/ShiftsScreen";
import { ShiftDetailScreen } from "./src/screens/ShiftDetailScreen";
import { PatrolScreen } from "./src/screens/PatrolScreen";
import { IncidentReportScreen } from "./src/screens/IncidentReportScreen";
import { ScheduleScreen } from "./src/screens/ScheduleScreen";

const Stack = createNativeStackNavigator<ShiftsStackParamList>();
const Tab = createBottomTabNavigator();

function ShiftsStack({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ShiftsList">
        {({ navigation }) => (
          <ShiftsScreen
            onSelectShift={(shiftId) => navigation.navigate("ShiftDetail", { shiftId })}
            onSignOut={onSignOut}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ShiftDetail" component={ShiftDetailScreen} />
      <Stack.Screen name="Patrol" component={PatrolScreen} />
      <Stack.Screen name="IncidentReport" component={IncidentReportScreen} options={{ presentation: "modal" }} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (checkingSession || !fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!session) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <LoginScreen />
          <StatusBar style="dark" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.brand,
            tabBarInactiveTintColor: colors.muted,
            tabBarIcon: () => null,
            tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 12 },
          }}
        >
          <Tab.Screen name="Shifts">{() => <ShiftsStack onSignOut={() => supabase.auth.signOut()} />}</Tab.Screen>
          <Tab.Screen name="Schedule" component={ScheduleScreen} />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});
