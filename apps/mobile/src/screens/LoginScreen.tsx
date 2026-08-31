import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { supabase } from "../lib/supabase";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleLogin() {
    setError(null);
    setPending(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !data.user) {
      setPending(false);
      setError("Invalid email or password.");
      return;
    }

    // This is a UX guard rail, not the security boundary — RLS is. A Guard
    // account exists only for this app; the web dashboard rejects it too.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role !== "guard") {
      await supabase.auth.signOut();
      setPending(false);
      setError("This account is for the web dashboard, not the mobile app.");
      return;
    }

    setPending(false);
    // App.tsx's onAuthStateChange listener picks up the session from here.
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Safe Track Centrum</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        testID="email-input"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        testID="password-input"
      />
      {error && (
        <Text style={styles.error} testID="login-error">
          {error}
        </Text>
      )}
      <Pressable style={styles.button} onPress={handleLogin} disabled={pending} testID="login-button">
        <Text style={styles.buttonText}>{pending ? "Signing in…" : "Sign in"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 10 },
  button: { backgroundColor: "#000", borderRadius: 6, padding: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#dc2626" },
});
