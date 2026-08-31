"use client";

import { useActionState } from "react";
import { assignOperationsManagerAction, type AssignOmFormState } from "./actions";
import type { OperationsManagerRecord } from "@/data/operations-managers";

const initialState: AssignOmFormState = { error: null };

export function AssignOmForm({
  siteId,
  operationsManagers,
}: {
  siteId: string;
  operationsManagers: OperationsManagerRecord[];
}) {
  const [state, formAction, pending] = useActionState(assignOperationsManagerAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded border p-4">
      <input type="hidden" name="siteId" value={siteId} />
      <label className="flex flex-col gap-1 text-sm">
        Operations Manager
        <select name="operationsManagerId" required className="rounded border px-2 py-1">
          <option value="">Select…</option>
          {operationsManagers.map((om) => (
            <option key={om.id} value={om.id}>
              {om.fullName}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Assigning…" : "Assign"}
      </button>
      {state.error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
