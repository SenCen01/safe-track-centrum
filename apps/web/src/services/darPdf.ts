import "server-only";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { vancouverDayRangeUtc } from "@/lib/timezone";

// @sparticuz/chromium's bundled binary is Linux-only (built for Lambda/
// Vercel's serverless runtime) — on Vercel (which sets VERCEL=1) launch that;
// everywhere else (local dev), launch the system-installed Chrome via
// puppeteer-core's channel auto-detection instead of bundling a second copy
// of Chromium just for local use.
async function launchBrowser() {
  if (process.env.VERCEL) {
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  return puppeteer.launch({ channel: "chrome", headless: true });
}

// Same brand tokens as apps/web/src/app/globals.css's --centrum-* custom
// properties, plus the Badge component's complete/incomplete colors
// (apps/web/src/components/ui/Badge.tsx) — inlined by hand since Puppeteer
// renders standalone HTML and can't read this app's CSS custom properties
// or Tailwind classes.
const BRAND = "#0a6d3c";
const BRAND_DARK = "#1e2a27";
const MUTED = "#4a6358";
const COMPLETE_BG = "#f0fdf4";
const COMPLETE_TEXT = "#15803d";
const COMPLETE_BORDER = "#bbf7d0";
const INCOMPLETE_BG = "#fffbeb";
const INCOMPLETE_TEXT = "#b45309";
const INCOMPLETE_BORDER = "#fde68a";

export type DarPdfData = {
  siteName: string;
  siteAddress: string;
  date: string; // YYYY-MM-DD, Vancouver-local
  generatedAt: string;
  shifts: Array<{
    guardName: string;
    scheduledStart: string;
    scheduledEnd: string;
    actualStart: string | null;
    actualEnd: string | null;
    status: string;
    patrols: Array<{
      startedAt: string;
      endedAt: string | null;
      status: string;
      totalCheckpoints: number;
      checkpointScans: Array<{ checkpointName: string; scannedAt: string; photoDataUri: string | null }>;
      missedCheckpoints: string[];
    }>;
    incidents: Array<{ description: string; occurredAt: string; photoDataUris: string[] }>;
  }>;
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Whole-minute duration between two instants, e.g. "7h 42m" or "35m" — used
// for both shift hours-worked and patrol duration.
function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms <= 0) return "—";
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function statBox(value: string | number, label: string): string {
  return `<div class="stat"><div class="value">${value}</div><div class="label">${label}</div></div>`;
}

function renderHtml(data: DarPdfData): string {
  const totalGuards = new Set(data.shifts.map((s) => s.guardName)).size;
  const totalShifts = data.shifts.length;
  const allPatrols = data.shifts.flatMap((s) => s.patrols);
  const completedPatrols = allPatrols.filter((p) => p.status === "complete").length;
  const incompletePatrols = allPatrols.filter((p) => p.status === "incomplete").length;
  const checkpointsScanned = allPatrols.reduce((sum, p) => sum + p.checkpointScans.length, 0);
  const checkpointsPossible = allPatrols.reduce((sum, p) => sum + p.totalCheckpoints, 0);
  const totalIncidents = data.shifts.reduce((sum, s) => sum + s.incidents.length, 0);

  const summarySection = `
    <div class="stats">
      ${statBox(totalGuards, "Guards on Site")}
      ${statBox(totalShifts, "Shifts")}
      ${statBox(`${completedPatrols}/${completedPatrols + incompletePatrols}`, "Patrols Completed")}
      ${statBox(`${checkpointsScanned}/${checkpointsPossible}`, "Checkpoints Scanned")}
      ${statBox(totalIncidents, "Incidents")}
    </div>
  `;

  const shiftSections = data.shifts
    .map((shift) => {
      const hoursWorked =
        shift.actualStart && shift.actualEnd ? formatDuration(shift.actualStart, shift.actualEnd) : "—";

      const patrolSections = shift.patrols
        .map((patrol) => {
          const scanRows = patrol.checkpointScans
            .map(
              (s) => `
            <tr>
              <td>${escapeHtml(s.checkpointName)}</td>
              <td>${formatTime(s.scannedAt)}</td>
              <td>${s.photoDataUri ? `<img class="thumb" src="${s.photoDataUri}" />` : "—"}</td>
            </tr>
          `,
            )
            .join("");

          const duration =
            patrol.endedAt !== null ? formatDuration(patrol.startedAt, patrol.endedAt) : "In progress";

          const missedBlock =
            patrol.missedCheckpoints.length > 0
              ? `<div class="missed">Missed: ${patrol.missedCheckpoints.map(escapeHtml).join(", ")}</div>`
              : "";

          return `
            <div class="patrol">
              <div class="patrol-head">
                <h4>Patrol — started ${formatTime(patrol.startedAt)} · ${duration} · ${patrol.checkpointScans.length}/${patrol.totalCheckpoints} checkpoints</h4>
                <span class="badge ${patrol.status === "complete" ? "badge-complete" : "badge-incomplete"}">
                  ${patrol.status === "complete" ? "Complete" : "Incomplete"}
                </span>
              </div>
              ${missedBlock}
              ${
                patrol.checkpointScans.length > 0
                  ? `<table><thead><tr><th>Checkpoint</th><th>Scanned</th><th>Photo</th></tr></thead><tbody>${scanRows}</tbody></table>`
                  : `<p class="empty">No checkpoints scanned.</p>`
              }
            </div>
          `;
        })
        .join("");

      const incidentSections = shift.incidents
        .map(
          (i) => `
        <div class="incident">
          <p><strong>${formatTime(i.occurredAt)}</strong> — ${escapeHtml(i.description)}</p>
          ${i.photoDataUris.length > 0 ? `<div class="thumbs">${i.photoDataUris.map((uri) => `<img class="thumb" src="${uri}" />`).join("")}</div>` : ""}
        </div>
      `,
        )
        .join("");

      return `
        <section class="shift">
          <h3>${escapeHtml(shift.guardName)} — ${escapeHtml(shift.status)}</h3>
          <p class="subtitle">
            Scheduled ${formatTime(shift.scheduledStart)}–${formatTime(shift.scheduledEnd)}
            ${shift.actualStart ? ` · Clocked in ${formatTime(shift.actualStart)}` : ""}
            ${shift.actualEnd ? ` · Clocked out ${formatTime(shift.actualEnd)}` : ""}
            ${hoursWorked !== "—" ? ` · ${hoursWorked} worked` : ""}
          </p>
          ${patrolSections || `<p class="empty">No Patrols.</p>`}
          ${shift.incidents.length > 0 ? `<h4>Incidents</h4>${incidentSections}` : ""}
        </section>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e2a27; margin: 0; padding: 40px; }
          h1 { font-size: 20px; margin: 0 0 4px; color: ${BRAND_DARK}; }
          .subtitle { color: ${MUTED}; font-size: 13px; margin: 0 0 4px; }
          .generated { color: ${MUTED}; font-size: 11px; margin: 0 0 20px; }
          h3 { font-size: 15px; color: ${BRAND_DARK}; margin: 24px 0 2px; border-top: 1px solid #e4e4e7; padding-top: 16px; }
          h4 { font-size: 12px; color: ${MUTED}; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th { text-align: left; font-size: 11px; color: ${MUTED}; padding: 4px 8px; border-bottom: 2px solid #e4e4e7; }
          td { font-size: 12px; padding: 6px 8px; border-bottom: 1px solid #e4e4e7; vertical-align: middle; }
          .empty { color: #a1a1aa; font-size: 12px; font-style: italic; margin: 4px 0; }
          .patrol { margin-bottom: 14px; }
          .patrol-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
          .patrol-head h4 { margin: 0; }
          .badge { font-size: 10px; font-weight: 700; letter-spacing: 0.03em; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
          .badge-complete { background: ${COMPLETE_BG}; color: ${COMPLETE_TEXT}; border: 1px solid ${COMPLETE_BORDER}; }
          .badge-incomplete { background: ${INCOMPLETE_BG}; color: ${INCOMPLETE_TEXT}; border: 1px solid ${INCOMPLETE_BORDER}; }
          .missed { background: ${INCOMPLETE_BG}; color: ${INCOMPLETE_TEXT}; border: 1px solid ${INCOMPLETE_BORDER}; border-radius: 6px; padding: 6px 10px; font-size: 12px; margin: 6px 0; }
          .incident { border-left: 3px solid ${BRAND}; padding-left: 10px; margin-bottom: 10px; font-size: 12px; }
          .thumb { height: 130px; width: 170px; object-fit: cover; border-radius: 8px; margin: 3px; border: 1px solid #e4e4e7; }
          .thumbs { display: flex; flex-wrap: wrap; }
          .stats { display: flex; gap: 12px; margin: 4px 0 24px; }
          .stat { flex: 1; border: 1px solid #e4e4e7; border-radius: 10px; padding: 12px 14px; }
          .stat .value { font-size: 20px; font-weight: 700; color: ${BRAND_DARK}; }
          .stat .label { font-size: 11px; color: ${MUTED}; margin-top: 2px; }
        </style>
      </head>
      <body>
        <h1>Daily Activity Report</h1>
        <p class="subtitle">${escapeHtml(data.siteName)} — ${escapeHtml(data.siteAddress)} — ${data.date}</p>
        <p class="generated">Report generated ${new Date(data.generatedAt).toLocaleString()}</p>
        ${summarySection}
        ${shiftSections}
      </body>
    </html>
  `;
}

export async function buildDarPdf(data: DarPdfData): Promise<{ buffer: Buffer; filename: string }> {
  const html = renderHtml(data);

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const buffer = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "20px", bottom: "60px", left: "0", right: "0" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `
        <div style="font-size:9px; color:#71717a; width:100%; padding:0 40px; display:flex; justify-content:space-between; font-family: -apple-system, Arial, sans-serif;">
          <span>Confidential — prepared by Safe Track Centrum for the intended recipient only.</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
    });

    return { buffer: Buffer.from(buffer), filename: `DAR - ${data.siteName} - ${data.date}.pdf` };
  } finally {
    await browser.close();
  }
}

async function toDataUri(supabase: SupabaseClient, bucket: string, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;

  const buf = Buffer.from(await data.arrayBuffer());
  return `data:${data.type || "image/jpeg"};base64,${buf.toString("base64")}`;
}

type DarPatrol = { id: string; started_at: string; ended_at: string | null; status: string };
type DarIncident = { id: string; occurred_at: string; description: string };

// Returns null if the Site has no Shifts on that Vancouver calendar date —
// the route handler turns that into a 404.
export async function assembleDarData(siteId: string, date: string): Promise<DarPdfData | null> {
  const supabase = await createClient();

  const { data: site } = await supabase.from("sites").select("name, address").eq("id", siteId).single();
  if (!site) return null;

  const { startUtc, endUtc } = vancouverDayRangeUtc(date);

  const { data: shifts, error: shiftsError } = await supabase
    .from("shifts")
    .select("id, scheduled_start, scheduled_end, actual_start, actual_end, status, profiles!guard_id(full_name)")
    .eq("site_id", siteId)
    .gte("scheduled_start", startUtc)
    .lt("scheduled_start", endUtc)
    .order("scheduled_start");

  if (shiftsError) throw new Error(shiftsError.message);
  if (!shifts || shifts.length === 0) return null;

  const shiftIds = shifts.map((s) => s.id);

  // Full ordered Checkpoint list for the Site's Route — used to compute
  // each Patrol's total possible Checkpoints and, for an incomplete Patrol,
  // which ones were never reached. CONTEXT.md: exactly one Route per Site.
  const { data: route } = await supabase
    .from("routes")
    .select("checkpoints(sequence_number, name)")
    .eq("site_id", siteId)
    .maybeSingle();
  const routeCheckpoints = ((route?.checkpoints ?? []) as Array<{ sequence_number: number; name: string }>)
    .slice()
    .sort((a, b) => a.sequence_number - b.sequence_number);

  const { data: dars, error: darsError } = await supabase
    .from("daily_activity_reports")
    .select("shift_id, patrols, incidents")
    .in("shift_id", shiftIds);
  if (darsError) throw new Error(darsError.message);

  const darByShift = new Map((dars ?? []).map((d) => [d.shift_id, d]));
  const allPatrols = (dars ?? []).flatMap((d) => (d.patrols ?? []) as DarPatrol[]);
  const allIncidents = (dars ?? []).flatMap((d) => (d.incidents ?? []) as DarIncident[]);
  const patrolIds = allPatrols.map((p) => p.id);
  const incidentIds = allIncidents.map((i) => i.id);

  const [{ data: scans, error: scansError }, { data: incidentPhotos, error: incidentPhotosError }] = await Promise.all([
    patrolIds.length
      ? supabase
          .from("checkpoint_scans")
          .select("patrol_id, sequence_number, scanned_at, photo_storage_path, checkpoints(name)")
          .in("patrol_id", patrolIds)
          .order("sequence_number")
      : Promise.resolve({ data: [], error: null }),
    incidentIds.length
      ? supabase.from("incident_photos").select("incident_id, storage_path").in("incident_id", incidentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (scansError) throw new Error(scansError.message);
  if (incidentPhotosError) throw new Error(incidentPhotosError.message);

  const scansByPatrol = new Map<string, typeof scans>();
  for (const s of scans ?? []) {
    const list = scansByPatrol.get(s.patrol_id) ?? [];
    list.push(s);
    scansByPatrol.set(s.patrol_id, list);
  }

  const photosByIncident = new Map<string, string[]>();
  for (const p of incidentPhotos ?? []) {
    const list = photosByIncident.get(p.incident_id) ?? [];
    list.push(p.storage_path);
    photosByIncident.set(p.incident_id, list);
  }

  // Every scan/incident photo for this Site/date, downloaded once and
  // reused below — bounded by one Site/day's photo count, not unbounded.
  const checkpointDataUriByPath = new Map<string, string | null>();
  const incidentDataUriByPath = new Map<string, string | null>();
  await Promise.all([
    ...[...scansByPatrol.values()].flat().map(async (s) => {
      if (!s.photo_storage_path) return;
      checkpointDataUriByPath.set(s.photo_storage_path, await toDataUri(supabase, "checkpoint-photos", s.photo_storage_path));
    }),
    ...[...photosByIncident.values()].flat().map(async (path) => {
      incidentDataUriByPath.set(path, await toDataUri(supabase, "incident-photos", path));
    }),
  ]);

  return {
    siteName: site.name,
    siteAddress: site.address,
    date,
    generatedAt: new Date().toISOString(),
    shifts: shifts.map((shift) => {
      const dar = darByShift.get(shift.id);
      const patrols = (dar?.patrols ?? []) as DarPatrol[];
      const incidents = (dar?.incidents ?? []) as DarIncident[];

      return {
        guardName: (shift.profiles as unknown as { full_name: string } | null)?.full_name ?? "—",
        scheduledStart: shift.scheduled_start,
        scheduledEnd: shift.scheduled_end,
        actualStart: shift.actual_start,
        actualEnd: shift.actual_end,
        status: shift.status,
        patrols: patrols.map((p) => {
          const patrolScans = scansByPatrol.get(p.id) ?? [];
          const missedCheckpoints =
            p.status === "incomplete" ? routeCheckpoints.slice(patrolScans.length).map((c) => c.name) : [];

          return {
            startedAt: p.started_at,
            endedAt: p.ended_at,
            status: p.status,
            totalCheckpoints: routeCheckpoints.length,
            checkpointScans: patrolScans.map((s) => ({
              checkpointName: (s.checkpoints as unknown as { name: string } | null)?.name ?? "—",
              scannedAt: s.scanned_at,
              photoDataUri: s.photo_storage_path ? (checkpointDataUriByPath.get(s.photo_storage_path) ?? null) : null,
            })),
            missedCheckpoints,
          };
        }),
        incidents: incidents.map((i) => ({
          description: i.description,
          occurredAt: i.occurred_at,
          photoDataUris: (photosByIncident.get(i.id) ?? [])
            .map((path) => incidentDataUriByPath.get(path))
            .filter((uri): uri is string => !!uri),
        })),
      };
    }),
  };
}
