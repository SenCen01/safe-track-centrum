import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Image } from "react-native";
import { supabase } from "../lib/supabase";
import { colors, fonts, radius } from "../lib/theme";

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
      <Image source={require("../../assets/logos/icon_logo.png")} style={styles.logo} />
      <Text style={styles.title}>Safe Track Centrum</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          testID="email-input"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.muted}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 20,
    backgroundColor: colors.background,
  },
  logo: { width: 72, height: 72, resizeMode: "contain" },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  card: {
    width: "100%",
    maxWidth: 360,
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  input: {
    fontFamily: fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    color: colors.text,
    backgroundColor: "#fff",
  },
  button: { backgroundColor: colors.brand, borderRadius: radius.md, padding: 14, alignItems: "center" },
  buttonText: { fontFamily: fonts.bodyBold, color: "#fff", fontSize: 15 },
  error: { fontFamily: fonts.body, color: colors.danger, fontSize: 13 },
});
