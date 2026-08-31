"use server";

import { revalidatePath } from "next/cache";
import { createUserAccount } from "@/data/users";

export type CreateUserFormState = {
  error: string | null;
  temporaryPassword: string | null;
};

export async function createUserAction(
  _prevState: CreateUserFormState,
  formData: FormData,
): Promise<CreateUserFormState> {
  const { error, temporaryPassword } = await createUserAccount({
    email: String(formData.get("email") ?? ""),
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    // zod rejects anything other than "guard"/"operations_manager" below —
    // an unexpected value here should error, not silently fall back.
    role: formData.get("role") as "guard" | "operations_manager",
  });

  if (error) return { error, temporaryPassword: null };

  revalidatePath("/admin/users");
  return { error: null, temporaryPassword };
}
