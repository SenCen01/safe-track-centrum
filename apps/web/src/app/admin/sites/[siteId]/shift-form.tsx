"use client";

import { useActionState } from "react";
import { createShiftAction, type CreateShiftFormState } from "./actions";
import type { GuardRecord } from "@/data/shifts";

const initialState: CreateShiftFormState = { error: null };

export function ShiftForm({ siteId, guards }: { siteId: string; guards: GuardRecord[] }) {
  const [state, formAction, pending] = useActionState(createShiftAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded border p-4">
      <input type="hidden" name="siteId" value={siteId} />
      <label className="flex flex-col gap-1 text-sm">
        Guard
        <select name="guardId" required className="rounded border px-2 py-1">
          <option value="">Select a guard…</option>
          {guards.map((g) => (
            <option key={g.id} value={g.id}>
              {g.fullName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Scheduled start
        <input type="datetime-local" name="scheduledStart" required className="rounded border px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Scheduled end
        <input type="datetime-local" name="scheduledEnd" required className="rounded border px-2 py-1" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add shift"}
      </button>
      {state.error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
