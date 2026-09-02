import { requireOperationsManagerOrAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { assembleDarData, buildDarPdf } from "@/services/darPdf";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    await requireOperationsManagerOrAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { siteId } = await params;
  const date = new URL(request.url).searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "date query param (YYYY-MM-DD) is required" }, { status: 400 });
  }

  // Fail-fast scope check reusing the sites_select RLS policy (is_admin()
  // OR om_covers_site(id)) — a Site outside the caller's coverage returns
  // 0 rows here, the same signal RLS gives everywhere else, surfaced as a
  // clean 404 instead of an empty PDF.
  const supabase = await createClient();
  const { data: site } = await supabase.from("sites").select("id").eq("id", siteId).single();
  if (!site) {
    return Response.json({ error: "Site not found" }, { status: 404 });
  }

  const data = await assembleDarData(siteId, date);
  if (!data) {
    return Response.json({ error: "No Shifts found for this Site/date" }, { status: 404 });
  }

  const { buffer, filename } = await buildDarPdf(data);

  // Buffer's ArrayBufferLike type isn't assignable to BodyInit's stricter
  // ArrayBuffer-backed view (Buffer's backing store could theoretically be
  // a SharedArrayBuffer per its type, though never actually is here) —
  // copying into a fresh Uint8Array sidesteps that without an unsafe cast.
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
