import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SiteRecord = {
  id: string;
  name: string;
  address: string;
  clientName: string;
};

export async function listSites(): Promise<SiteRecord[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites")
    .select("id, name, address, clients(name)")
    .order("name");

  if (error) throw new Error(error.message);

  return data.map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    clientName: (s.clients as unknown as { name: string } | null)?.name ?? "—",
  }));
}

export async function getSiteById(siteId: string): Promise<SiteRecord | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites")
    .select("id, name, address, clients(name)")
    .eq("id", siteId)
    .single();

  if (error) return null;

  return {
    id: data.id,
    name: data.name,
    address: data.address,
    clientName: (data.clients as unknown as { name: string } | null)?.name ?? "—",
  };
}

const createSiteSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  address: z.string().trim().min(1, "Address is required"),
  clientId: z.string().trim().uuid("A client must be selected"),
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;

export async function createSiteRecord(
  input: CreateSiteInput,
): Promise<{ error: string | null }> {
  await requireAdmin();

  const parsed = createSiteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .insert({
      name: parsed.data.name,
      address: parsed.data.address,
      client_id: parsed.data.clientId,
    })
    .select("id")
    .single();

  if (siteError) return { error: siteError.message };

  // Exactly one Route per Site for v1 (see CONTEXT.md) — created alongside
  // the Site so callers only ever deal with "Sites", not a separate Route
  // creation step. NOTE: no transaction here (PostgREST doesn't expose
  // client-side multi-statement transactions) — if this insert fails, the
  // Site row from above is left without a Route. Known v1 gap; surfaced as
  // an error rather than worked around.
  const { error: routeError } = await supabase.from("routes").insert({ site_id: site.id });

  if (routeError) {
    return {
      error: `Site was created, but its Route failed to create: ${routeError.message}`,
    };
  }

  return { error: null };
}
