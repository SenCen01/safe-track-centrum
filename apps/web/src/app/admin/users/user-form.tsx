"use client";

import { useActionState } from "react";
import { createUserAction, type CreateUserFormState } from "./actions";

const initialState: CreateUserFormState = { error: null, temporaryPassword: null };

export function UserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, initialState);

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-wrap items-end gap-3 rounded border p-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input name="email" type="email" required className="rounded border px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Full name
          <input name="fullName" required className="rounded border px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Phone
          <input name="phone" className="rounded border px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Role
          <select name="role" className="rounded border px-2 py-1">
            <option value="guard">Guard</option>
            <option value="operations_manager">Operations Manager</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create user"}
        </button>
        {state.error && (
          <p role="alert" className="w-full text-sm text-red-600">
            {state.error}
          </p>
        )}
      </form>
      {state.temporaryPassword && (
        <div role="status" className="rounded border border-amber-400 bg-amber-50 p-4 text-sm">
          <p className="font-medium">Account created.</p>
          <p>
            Temporary password: <code className="font-mono">{state.temporaryPassword}</code>
          </p>
          <p className="mt-1 text-amber-800">
            Share this password with the new user — it will not be shown again.
          </p>
        </div>
      )}
    </div>
  );
}
