import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type GuardRecord = {
  id: string;
  fullName: string;
};

export async function listAllGuards(): Promise<GuardRecord[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "guard")
    .order("full_name");

  if (error) throw new Error(error.message);
  return data.map((p) => ({ id: p.id, fullName: p.full_name }));
}

export type ShiftRecord = {
  id: string;
  guardName: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: "scheduled" | "in_progress" | "completed";
};

export async function listShiftsForSite(siteId: string): Promise<ShiftRecord[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    // shifts has two FKs to profiles (guard_id, assigned_by) — PostgREST
    // can't infer which one to embed without disambiguating by column name.
    .select("id, scheduled_start, scheduled_end, status, profiles!guard_id(full_name)")
    .eq("site_id", siteId)
    .order("scheduled_start", { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((s) => ({
    id: s.id,
    guardName: (s.profiles as unknown as { full_name: string } | null)?.full_name ?? "—",
    scheduledStart: s.scheduled_start,
    scheduledEnd: s.scheduled_end,
    status: s.status,
  }));
}

const createShiftSchema = z
  .object({
    siteId: z.string().trim().uuid("Invalid site"),
    guardId: z.string().trim().uuid("A guard must be selected"),
    scheduledStart: z.string().trim().min(1, "Start time is required"),
    scheduledEnd: z.string().trim().min(1, "End time is required"),
  })
  .refine((v) => new Date(v.scheduledEnd) > new Date(v.scheduledStart), {
    message: "End time must be after start time",
    path: ["scheduledEnd"],
  });

export type CreateShiftInput = z.infer<typeof createShiftSchema>;

export async function createShift(input: CreateShiftInput): Promise<{ error: string | null }> {
  const admin = await requireAdmin();

  const parsed = createShiftSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("shifts").insert({
    site_id: parsed.data.siteId,
    guard_id: parsed.data.guardId,
    assigned_by: admin.id,
    scheduled_start: new Date(parsed.data.scheduledStart).toISOString(),
    scheduled_end: new Date(parsed.data.scheduledEnd).toISOString(),
  });

  if (error) return { error: error.message };
  return { error: null };
}
