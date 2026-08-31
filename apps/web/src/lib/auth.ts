import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "operations_manager" | "guard";

export type CurrentUser = {
  id: string;
  role: Role;
  fullName: string;
};

// Cached per-request: multiple Server Components/Actions in the same render
// can call this without re-hitting the network more than once.
//
// Uses auth.getUser(), not auth.getSession() — getUser() revalidates the
// token against the Auth server, so a caller can't spoof a session by
// tampering with the cookie alone. See Next.js's Data Security guide.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return { id: user.id, role: profile.role as Role, fullName: profile.full_name };
});

// Every Server Action and admin page must call this itself — a layout-level
// redirect does not protect Server Actions, which remain directly callable.
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return user;
}
