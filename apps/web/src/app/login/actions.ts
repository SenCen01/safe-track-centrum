"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export type LoginState = { error: string | null };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid email or password." };
  }

  const user = await getCurrentUser();

  if (user?.role === "admin") {
    redirect("/admin");
  }

  if (user?.role === "operations_manager") {
    redirect("/dashboard");
  }

  // Guards don't get web access — this is a UX guard rail, not the security
  // boundary (RLS is). A Guard account exists only for the mobile app.
  await supabase.auth.signOut();
  return { error: "This account is for the mobile app. Please use the Guard app instead." };
}
