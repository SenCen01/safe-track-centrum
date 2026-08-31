import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ClientRecord = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

export async function listClients(): Promise<ClientRecord[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, contact_name, contact_email, contact_phone")
    .order("name");

  if (error) throw new Error(error.message);

  return data.map((c) => ({
    id: c.id,
    name: c.name,
    contactName: c.contact_name,
    contactEmail: c.contact_email,
    contactPhone: c.contact_phone,
  }));
}

const createClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  contactName: z.string().trim().optional(),
  contactEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  contactPhone: z.string().trim().optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export async function createClientRecord(
  input: CreateClientInput,
): Promise<{ error: string | null }> {
  await requireAdmin();

  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert({
    name: parsed.data.name,
    contact_name: parsed.data.contactName || null,
    contact_email: parsed.data.contactEmail || null,
    contact_phone: parsed.data.contactPhone || null,
  });

  if (error) return { error: error.message };
  return { error: null };
}
