"use server";

import { revalidatePath } from "next/cache";
import { createSiteRecord } from "@/data/sites";

export type CreateSiteFormState = { error: string | null };

export async function createSiteAction(
  _prevState: CreateSiteFormState,
  formData: FormData,
): Promise<CreateSiteFormState> {
  const { error } = await createSiteRecord({
    name: String(formData.get("name") ?? ""),
    address: String(formData.get("address") ?? ""),
    clientId: String(formData.get("clientId") ?? ""),
  });

  if (error) return { error };

  revalidatePath("/admin/sites");
  return { error: null };
}
