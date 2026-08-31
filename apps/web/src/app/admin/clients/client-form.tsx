"use client";

import { useActionState } from "react";
import { createClientAction, type CreateClientFormState } from "./actions";

const initialState: CreateClientFormState = { error: null };

export function ClientForm() {
  const [state, formAction, pending] = useActionState(createClientAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded border p-4">
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input name="name" required className="rounded border px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Contact name
        <input name="contactName" className="rounded border px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Contact email
        <input name="contactEmail" type="email" className="rounded border px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Contact phone
        <input name="contactPhone" className="rounded border px-2 py-1" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add client"}
      </button>
      {state.error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
