import "server-only";
import { requireOperationsManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { vancouverDateString } from "@/lib/timezone";

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

export type LiveGuardLocationRecord = {
  shiftId: string;
  guardName: string;
  siteId: string;
  siteName: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
};

// Most recent GPS ping per Guard currently on an in_progress Shift — broader
// than "in an active Patrol" (a Guard clocked in but between Patrols still
// shows up), matching what record_location_ping() actually tracks.
export async function listLiveGuardLocations(): Promise<LiveGuardLocationRecord[]> {
  await requireOperationsManager();
  const supabase = await createClient();

  const { data: shifts, error: shiftsError } = await supabase
    .from("shifts")
    .select("id, site_id, sites(name), profiles!guard_id(full_name)")
    .eq("status", "in_progress");

  if (shiftsError) throw new Error(shiftsError.message);
  if (shifts.length === 0) return [];

  const shiftIds = shifts.map((s) => s.id);
  const { data: pings, error: pingsError } = await supabase
    .from("guard_location_pings")
    .select("shift_id, latitude, longitude, recorded_at")
    .in("shift_id", shiftIds)
    .order("recorded_at", { ascending: false });

  if (pingsError) throw new Error(pingsError.message);

  const latestByShift = new Map<string, { latitude: number; longitude: number; recorded_at: string }>();
  for (const p of pings) {
    if (!latestByShift.has(p.shift_id)) latestByShift.set(p.shift_id, p);
  }

  return shifts
    .map((s) => {
      const ping = latestByShift.get(s.id);
      if (!ping) return null;
      return {
        shiftId: s.id,
        guardName: (s.profiles as unknown as { full_name: string } | null)?.full_name ?? "—",
        siteId: s.site_id,
        siteName: (s.sites as unknown as { name: string } | null)?.name ?? "—",
        latitude: ping.latitude,
        longitude: ping.longitude,
        recordedAt: ping.recorded_at,
      };
    })
    .filter((r): r is LiveGuardLocationRecord => r !== null);
}

export type LivePatrolRecord = {
  patrolId: string;
  shiftId: string;
  siteId: string;
  siteName: string;
  guardName: string;
  patrolNumberInShift: number;
  startedAt: string;
  checkpointsDone: number;
  checkpointsTotal: number;
  lastCheckpointName: string | null;
  lastScannedAt: string | null;
  nextCheckpointName: string | null;
};

type PatrolRouteEmbed = {
  shift_id: string;
  started_at: string;
  shifts: { site_id: string; sites: { name: string } | null; profiles: { full_name: string } | null } | null;
  routes: { checkpoints: { id: string; sequence_number: number; name: string }[] } | null;
};

export async function listLivePatrols(): Promise<LivePatrolRecord[]> {
  await requireOperationsManager();
  const supabase = await createClient();

  const { data: activePatrols, error: activeError } = await supabase
    .from("patrols")
    .select(
      "id, shift_id, started_at, shifts(site_id, sites(name), profiles!guard_id(full_name)), routes(checkpoints(id, sequence_number, name))",
    )
    .eq("status", "in_progress");

  if (activeError) throw new Error(activeError.message);
  if (activePatrols.length === 0) return [];

  const shiftIds = [...new Set(activePatrols.map((p) => p.shift_id))];
  const patrolIds = activePatrols.map((p) => p.id);

  const [{ data: shiftPatrols, error: shiftPatrolsError }, { data: scans, error: scansError }] = await Promise.all([
    // All Patrols (any status) for these Shifts, ordered, to compute each
    // active Patrol's ordinal — the active-only query above can't derive
    // this by itself.
    supabase.from("patrols").select("id, shift_id, started_at").in("shift_id", shiftIds).order("started_at"),
    supabase
      .from("checkpoint_scans")
      .select("patrol_id, sequence_number, scanned_at, checkpoints(name)")
      .in("patrol_id", patrolIds)
      .order("sequence_number", { ascending: false }),
  ]);

  if (shiftPatrolsError) throw new Error(shiftPatrolsError.message);
  if (scansError) throw new Error(scansError.message);

  const ordinalByPatrolId = new Map<string, number>();
  const countByShiftId = new Map<string, number>();
  for (const p of shiftPatrols) {
    const ordinal = (countByShiftId.get(p.shift_id) ?? 0) + 1;
    countByShiftId.set(p.shift_id, ordinal);
    ordinalByPatrolId.set(p.id, ordinal);
  }

  const doneCountByPatrolId = new Map<string, number>();
  const lastScanByPatrolId = new Map<string, { name: string; scannedAt: string }>();
  for (const s of scans) {
    doneCountByPatrolId.set(s.patrol_id, (doneCountByPatrolId.get(s.patrol_id) ?? 0) + 1);
    // Ordered sequence_number desc above, so the first row seen per patrol is the last scan.
    if (!lastScanByPatrolId.has(s.patrol_id)) {
      lastScanByPatrolId.set(s.patrol_id, {
        name: (s.checkpoints as unknown as { name: string } | null)?.name ?? "—",
        scannedAt: s.scanned_at,
      });
    }
  }

  return (activePatrols as unknown as PatrolRouteEmbed[]).map((p, i) => {
    const patrolId = activePatrols[i].id;
    const checkpoints = (p.routes?.checkpoints ?? []).slice().sort((a, b) => a.sequence_number - b.sequence_number);
    const checkpointsDone = doneCountByPatrolId.get(patrolId) ?? 0;
    const lastScan = lastScanByPatrolId.get(patrolId) ?? null;
    const nextCheckpoint = checkpoints.find((c) => c.sequence_number === checkpointsDone + 1) ?? null;

    return {
      patrolId,
      shiftId: p.shift_id,
      siteId: p.shifts?.site_id ?? "",
      siteName: p.shifts?.sites?.name ?? "—",
      guardName: p.shifts?.profiles?.full_name ?? "—",
      patrolNumberInShift: ordinalByPatrolId.get(patrolId) ?? 1,
      startedAt: p.started_at,
      checkpointsDone,
      checkpointsTotal: checkpoints.length,
      lastCheckpointName: lastScan?.name ?? null,
      lastScannedAt: lastScan?.scannedAt ?? null,
      nextCheckpointName: nextCheckpoint?.name ?? null,
    };
  });
}

export type PatrolCheckpointScanRecord = {
  id: string;
  patrolId: string;
  checkpointName: string;
  sequenceNumber: number;
  scannedAt: string;
  photoStoragePath: string | null;
};

export async function listCheckpointScansForPatrols(patrolIds: string[]): Promise<PatrolCheckpointScanRecord[]> {
  await requireOperationsManager();
  if (patrolIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkpoint_scans")
    .select("id, patrol_id, sequence_number, scanned_at, photo_storage_path, checkpoints(name)")
    .in("patrol_id", patrolIds)
    .order("sequence_number");

  if (error) throw new Error(error.message);

  return data.map((s) => ({
    id: s.id,
    patrolId: s.patrol_id,
    checkpointName: (s.checkpoints as unknown as { name: string } | null)?.name ?? "—",
    sequenceNumber: s.sequence_number,
    scannedAt: s.scanned_at,
    photoStoragePath: s.photo_storage_path,
  }));
}

// Mirrors listIncidentPhotoUrls, but 1:1 (one photo per scan) rather than
// 1:many — returns one signed URL per scan id instead of an array.
export async function listCheckpointPhotoUrls(scanIds: string[]): Promise<Record<string, string>> {
  await requireOperationsManager();
  if (scanIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkpoint_scans")
    .select("id, photo_storage_path")
    .in("id", scanIds)
    .not("photo_storage_path", "is", null);

  if (error) throw new Error(error.message);

  const result: Record<string, string> = {};

  await Promise.all(
    data.map(async (scan) => {
      const { data: signed, error: signError } = await supabase.storage
        .from("checkpoint-photos")
        .createSignedUrl(scan.photo_storage_path as string, SIGNED_URL_EXPIRY_SECONDS);

      if (signError || !signed) {
        console.error(`Failed to sign checkpoint photo ${scan.photo_storage_path}:`, signError);
        return;
      }

      result[scan.id] = signed.signedUrl;
    }),
  );

  return result;
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

const SIGNED_URL_EXPIRY_SECONDS = 3600;

// Keyed by incident id -> signed URLs for that incident's photos. The
// incident-photos bucket is private; createSignedUrl only succeeds if the
// calling user's own RLS (via the regular, non-admin client) permits
// reading that object — that's the real access control here, the signed
// URL itself is just how a private object becomes viewable in an <img>,
// not a substitute for RLS.
export async function listIncidentPhotoUrls(
  incidentIds: string[],
): Promise<Record<string, string[]>> {
  await requireOperationsManager();
  if (incidentIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incident_photos")
    .select("incident_id, storage_path")
    .in("incident_id", incidentIds);

  if (error) throw new Error(error.message);

  const result: Record<string, string[]> = {};

  await Promise.all(
    data.map(async (photo) => {
      const { data: signed, error: signError } = await supabase.storage
        .from("incident-photos")
        .createSignedUrl(photo.storage_path, SIGNED_URL_EXPIRY_SECONDS);

      if (signError || !signed) {
        // A broken thumbnail shouldn't take down the whole dashboard.
        console.error(`Failed to sign incident photo ${photo.storage_path}:`, signError);
        return;
      }

      (result[photo.incident_id] ??= []).push(signed.signedUrl);
    }),
  );

  return result;
}

export type DarSummaryRecord = {
  siteId: string;
  siteName: string;
  date: string;
  shiftCount: number;
};

// One row per (Site, Vancouver calendar date) that had at least one Shift —
// this is what the OM-facing "DAR" concept now means; the actual report is
// generated on demand as a PDF via /api/sites/[siteId]/dar (see darPdf.ts),
// not stored as its own record. Not available to Admin here (this list only
// feeds the OM-only dars/page.tsx) — Admin's DAR access is API-only, see
// the route handler's use of requireOperationsManagerOrAdmin().
export async function listDarSummaries(): Promise<DarSummaryRecord[]> {
  await requireOperationsManager();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    .select("site_id, scheduled_start, sites(name)")
    .order("scheduled_start", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  const summaryByKey = new Map<string, DarSummaryRecord>();
  for (const s of data) {
    const date = vancouverDateString(s.scheduled_start);
    const key = `${s.site_id}:${date}`;
    const existing = summaryByKey.get(key);
    if (existing) {
      existing.shiftCount += 1;
    } else {
      summaryByKey.set(key, {
        siteId: s.site_id,
        siteName: (s.sites as unknown as { name: string } | null)?.name ?? "—",
        date,
        shiftCount: 1,
      });
    }
  }

  return [...summaryByKey.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
