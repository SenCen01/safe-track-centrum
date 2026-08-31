import "server-only";
import { requireOperationsManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Every query below relies on RLS to scope rows to this Operations Manager's
// assigned Sites (see operations_manager_sites / om_covers_site() in the
// migration) — there is no manual "where site_id in (...)" filtering here.
// requireOperationsManager() is still required first: it's the application-
// level gate that decides whether this DAL should run at all, independent
// of what RLS would additionally allow/deny.

export type SiteRecord = {
  id: string;
  name: string;
  address: string;
};

export async function listMySites(): Promise<SiteRecord[]> {
  await requireOperationsManager();
  const supabase = await createClient();
  const { data, error } = await supabase.from("sites").select("id, name, address").order("name");

  if (error) throw new Error(error.message);
  return data;
}

export type ShiftRecord = {
  id: string;
  siteId: string;
  siteName: string;
  guardName: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: "scheduled" | "in_progress" | "completed";
};

export async function listMyShifts(): Promise<ShiftRecord[]> {
  await requireOperationsManager();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    // shifts has two FKs to profiles (guard_id, assigned_by) — must
    // disambiguate the embed, see src/data/shifts.ts for the same fix.
    .select("id, site_id, scheduled_start, scheduled_end, status, sites(name), profiles!guard_id(full_name)")
    .order("scheduled_start", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return data.map((s) => ({
    id: s.id,
    siteId: s.site_id,
    siteName: (s.sites as unknown as { name: string } | null)?.name ?? "—",
    guardName: (s.profiles as unknown as { full_name: string } | null)?.full_name ?? "—",
    scheduledStart: s.scheduled_start,
    scheduledEnd: s.scheduled_end,
    status: s.status,
  }));
}

export type IncidentRecord = {
  id: string;
  siteName: string;
  guardName: string;
  description: string;
  occurredAt: string;
};

export async function listMyIncidents(): Promise<IncidentRecord[]> {
  await requireOperationsManager();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .select("id, description, occurred_at, profiles!guard_id(full_name), shifts(sites(name))")
    .order("occurred_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return data.map((i) => ({
    id: i.id,
    siteName:
      (i.shifts as unknown as { sites: { name: string } | null } | null)?.sites?.name ?? "—",
    guardName: (i.profiles as unknown as { full_name: string } | null)?.full_name ?? "—",
    description: i.description,
    occurredAt: i.occurred_at,
  }));
}

export type DarRecord = {
  shiftId: string;
  patrolCount: number;
  incompletePatrolCount: number;
  incidentCount: number;
};

export async function listMyDars(): Promise<DarRecord[]> {
  await requireOperationsManager();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_activity_reports")
    .select("shift_id, patrols, incidents")
    .order("shift_id");

  if (error) throw new Error(error.message);

  return data.map((d) => {
    const patrols = (d.patrols ?? []) as Array<{ status: string }>;
    const incidents = (d.incidents ?? []) as unknown[];
    return {
      shiftId: d.shift_id,
      patrolCount: patrols.length,
      incompletePatrolCount: patrols.filter((p) => p.status === "incomplete").length,
      incidentCount: incidents.length,
    };
  });
}
