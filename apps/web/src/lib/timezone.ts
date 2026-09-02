// All Sites are currently in Vancouver — hardcoded rather than a per-site
// column, since there is exactly one timezone in practice today. If a Site
// outside Pacific time is ever onboarded, this becomes a sites.timezone
// column and callers pass it through instead.
export const SITE_TIMEZONE = "America/Vancouver";

// The UTC instant range [start, end) covering one Vancouver calendar day,
// e.g. for bucketing shifts.scheduled_start into "which day did this fall
// on, Vancouver-local" queries. Handles PST/PDT transitions correctly via
// Intl, not a fixed offset.
export function vancouverDayRangeUtc(dateStr: string): { startUtc: string; endUtc: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const startUtc = zonedMidnightToUtc(dateStr);
  const nextDateStr = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  const endUtc = zonedMidnightToUtc(nextDateStr);
  return { startUtc, endUtc };
}

// For grouping an instant into its Vancouver calendar date, e.g. bucketing
// shifts by (site, day) for the DAR summary list.
export function vancouverDateString(iso: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: SITE_TIMEZONE }).format(new Date(iso));
}

function zonedMidnightToUtc(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const offsetMinutes = getTimeZoneOffsetMinutes(guess, SITE_TIMEZONE);
  return new Date(guess.getTime() - offsetMinutes * 60000).toISOString();
}

// Offset (in minutes, UTC minus local) of `timeZone` at `date` — computed by
// formatting the instant in that zone and diffing against its UTC fields,
// rather than a fixed offset, so DST transitions resolve correctly.
function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUtc - date.getTime()) / 60000;
}
