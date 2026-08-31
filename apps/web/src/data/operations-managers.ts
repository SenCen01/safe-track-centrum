import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type OperationsManagerRecord = {
  id: string;
  fullName: string;
};

export async function listAllOperationsManagers(): Promise<OperationsManagerRecord[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "operations_manager")
    .order("full_name");

  if (error) throw new Error(error.message);
  return data.map((p) => ({ id: p.id, fullName: p.full_name }));
}

export async function listOperationsManagersForSite(
  siteId: string,
): Promise<OperationsManagerRecord[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operations_manager_sites")
    .select("operations_manager_id, profiles(id, full_name)")
    .eq("site_id", siteId);

  if (error) throw new Error(error.message);

  return data
    .map((row) => row.profiles as unknown as { id: string; full_name: string } | null)
    .filter((p): p is { id: string; full_name: string } => p !== null)
    .map((p) => ({ id: p.id, fullName: p.full_name }));
}

const siteAssignmentSchema = z.object({
  siteId: z.string().trim().uuid("Invalid site"),
  operationsManagerId: z.string().trim().uuid("An Operations Manager must be selected"),
});

export type SiteAssignmentInput = z.infer<typeof siteAssignmentSchema>;

export async function assignOperationsManagerToSite(
  input: SiteAssignmentInput,
): Promise<{ error: string | null }> {
  await requireAdmin();

  const parsed = siteAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("operations_manager_sites").insert({
    site_id: parsed.data.siteId,
    operations_manager_id: parsed.data.operationsManagerId,
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function unassignOperationsManagerFromSite(
  input: SiteAssignmentInput,
): Promise<{ error: string | null }> {
  await requireAdmin();

  const parsed = siteAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("operations_manager_sites")
    .delete()
    .eq("site_id", parsed.data.siteId)
    .eq("operations_manager_id", parsed.data.operationsManagerId);

  if (error) return { error: error.message };
  return { error: null };
}
