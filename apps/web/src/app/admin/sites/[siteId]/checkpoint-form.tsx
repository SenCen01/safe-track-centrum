"use client";

import { useActionState } from "react";
import { createCheckpointAction, type CreateCheckpointFormState } from "./actions";

const initialState: CreateCheckpointFormState = { error: null };

export function CheckpointForm({ siteId, routeId }: { siteId: string; routeId: string }) {
  const [state, formAction, pending] = useActionState(createCheckpointAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded border p-4">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="routeId" value={routeId} />
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input name="name" required className="rounded border px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        QR code
        <input name="qrCode" required className="rounded border px-2 py-1" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add checkpoint"}
      </button>
      {state.error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
