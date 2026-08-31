"use client";

import { useActionState } from "react";
import { createSiteAction, type CreateSiteFormState } from "./actions";
import type { ClientRecord } from "@/data/clients";

const initialState: CreateSiteFormState = { error: null };

export function SiteForm({ clients }: { clients: ClientRecord[] }) {
  const [state, formAction, pending] = useActionState(createSiteAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded border p-4">
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input name="name" required className="rounded border px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Address
        <input name="address" required className="rounded border px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Client
        <select name="clientId" required className="rounded border px-2 py-1">
          <option value="">Select a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add site"}
      </button>
      {state.error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
