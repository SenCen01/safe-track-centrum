"use server";

import { revalidatePath } from "next/cache";
import { createCheckpoint } from "@/data/checkpoints";
import { createShift } from "@/data/shifts";
import {
  assignOperationsManagerToSite,
  unassignOperationsManagerFromSite,
} from "@/data/operations-managers";

export type CreateShiftFormState = { error: string | null };

export async function createShiftAction(
  _prevState: CreateShiftFormState,
  formData: FormData,
): Promise<CreateShiftFormState> {
  const siteId = String(formData.get("siteId") ?? "");
  const { error } = await createShift({
    siteId,
    guardId: String(formData.get("guardId") ?? ""),
    scheduledStart: String(formData.get("scheduledStart") ?? ""),
    scheduledEnd: String(formData.get("scheduledEnd") ?? ""),
  });

  if (error) return { error };

  revalidatePath(`/admin/sites/${siteId}`);
  return { error: null };
}

export type CreateCheckpointFormState = { error: string | null };

export async function createCheckpointAction(
  _prevState: CreateCheckpointFormState,
  formData: FormData,
): Promise<CreateCheckpointFormState> {
  const siteId = String(formData.get("siteId") ?? "");
  const { error } = await createCheckpoint({
    routeId: String(formData.get("routeId") ?? ""),
    name: String(formData.get("name") ?? ""),
    qrCode: String(formData.get("qrCode") ?? ""),
  });

  if (error) return { error };

  revalidatePath(`/admin/sites/${siteId}`);
  return { error: null };
}

export type AssignOmFormState = { error: string | null };

export async function assignOperationsManagerAction(
  _prevState: AssignOmFormState,
  formData: FormData,
): Promise<AssignOmFormState> {
  const siteId = String(formData.get("siteId") ?? "");
  const { error } = await assignOperationsManagerToSite({
    siteId,
    operationsManagerId: String(formData.get("operationsManagerId") ?? ""),
  });

  if (error) return { error };

  revalidatePath(`/admin/sites/${siteId}`);
  return { error: null };
}

export async function unassignOperationsManagerAction(formData: FormData): Promise<void> {
  const siteId = String(formData.get("siteId") ?? "");
  const { error } = await unassignOperationsManagerFromSite({
    siteId,
    operationsManagerId: String(formData.get("operationsManagerId") ?? ""),
  });

  // No useActionState on this fire-and-forget button — surface failures via
  // the thrown error (Next's error boundary) rather than failing silently.
  if (error) throw new Error(error);

  revalidatePath(`/admin/sites/${siteId}`);
}
