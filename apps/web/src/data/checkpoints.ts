import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type RouteRecord = {
  id: string;
  name: string | null;
};

export async function getRouteBySiteId(siteId: string): Promise<RouteRecord | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routes")
    .select("id, name")
    .eq("site_id", siteId)
    .single();

  if (error) return null;
  return { id: data.id, name: data.name };
}

export type CheckpointRecord = {
  id: string;
  sequenceNumber: number;
  name: string;
  qrCode: string;
};

export async function listCheckpoints(routeId: string): Promise<CheckpointRecord[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkpoints")
    .select("id, sequence_number, name, qr_code")
    .eq("route_id", routeId)
    .order("sequence_number");

  if (error) throw new Error(error.message);

  return data.map((c) => ({
    id: c.id,
    sequenceNumber: c.sequence_number,
    name: c.name,
    qrCode: c.qr_code,
  }));
}

const createCheckpointSchema = z.object({
  routeId: z.string().trim().uuid("Invalid route"),
  name: z.string().trim().min(1, "Name is required"),
  qrCode: z.string().trim().min(1, "QR code is required"),
});

export type CreateCheckpointInput = z.infer<typeof createCheckpointSchema>;

export async function createCheckpoint(
  input: CreateCheckpointInput,
): Promise<{ error: string | null }> {
  await requireAdmin();

  const parsed = createCheckpointSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  // Next sequence number is computed server-side, never trusted from the
  // client — this is what keeps the Route's checkpoint order well-defined.
  const { data: existing, error: maxError } = await supabase
    .from("checkpoints")
    .select("sequence_number")
    .eq("route_id", parsed.data.routeId)
    .order("sequence_number", { ascending: false })
    .limit(1);

  if (maxError) return { error: maxError.message };

  const nextSequenceNumber = (existing[0]?.sequence_number ?? 0) + 1;

  const { error } = await supabase.from("checkpoints").insert({
    route_id: parsed.data.routeId,
    sequence_number: nextSequenceNumber,
    name: parsed.data.name,
    qr_code: parsed.data.qrCode,
  });

  if (error) return { error: error.message };
  return { error: null };
}
