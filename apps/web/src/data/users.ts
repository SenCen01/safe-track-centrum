import "server-only";
import crypto from "crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProfileRecord = {
  id: string;
  role: "admin" | "operations_manager" | "guard";
  fullName: string;
  phone: string | null;
};

export async function listProfiles(): Promise<ProfileRecord[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone")
    .order("full_name");

  if (error) throw new Error(error.message);

  return data.map((p) => ({
    id: p.id,
    role: p.role,
    fullName: p.full_name,
    phone: p.phone,
  }));
}

// Only Guard/Operations Manager are creatable from this UI. Admin accounts
// are intentionally higher friction (direct Admin API use) to avoid casual
// privilege escalation from a form.
const createUserSchema = z.object({
  email: z.string().trim().email("Invalid email"),
  fullName: z.string().trim().min(1, "Full name is required"),
  phone: z.string().trim().optional(),
  role: z.enum(["guard", "operations_manager"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export async function createUserAccount(
  input: CreateUserInput,
): Promise<{ error: string | null; temporaryPassword: string | null }> {
  await requireAdmin();

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input", temporaryPassword: null };
  }

  const temporaryPassword = crypto.randomBytes(12).toString("base64url");

  // Service-role client: creating an auth user requires the Admin API,
  // which bypasses RLS entirely. requireAdmin() above is the only gate —
  // it must run before this point, since the DB has no say over this call.
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      role: parsed.data.role,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || undefined,
    },
  });

  if (error) return { error: error.message, temporaryPassword: null };

  // profiles row is created by the handle_new_user DB trigger, not here.
  return { error: null, temporaryPassword };
}
