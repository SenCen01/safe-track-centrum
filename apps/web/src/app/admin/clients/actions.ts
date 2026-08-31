"use server";

import { revalidatePath } from "next/cache";
import { createClientRecord } from "@/data/clients";

export type CreateClientFormState = { error: string | null };

export async function createClientAction(
  _prevState: CreateClientFormState,
  formData: FormData,
): Promise<CreateClientFormState> {
  const { error } = await createClientRecord({
    name: String(formData.get("name") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    contactPhone: String(formData.get("contactPhone") ?? ""),
  });

  if (error) return { error };

  revalidatePath("/admin/clients");
  return { error: null };
}
