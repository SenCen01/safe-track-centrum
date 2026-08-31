"use client";

import { useActionState } from "react";
import { createShiftAction, type CreateShiftFormState } from "./actions";
import type { GuardRecord } from "@/data/shifts";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label, Select } from "@/components/ui/Input";

const initialState: CreateShiftFormState = { error: null };

export function ShiftForm({ siteId, guards }: { siteId: string; guards: GuardRecord[] }) {
  const [state, formAction, pending] = useActionState(createShiftAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-4 rounded-xl bg-surface-alt p-4">
      <input type="hidden" name="siteId" value={siteId} />
      <Label className="min-w-[10rem] flex-1">
        Guard
        <Select name="guardId" required defaultValue="">
          <option value="">Select a guard…</option>
          {guards.map((g) => (
            <option key={g.id} value={g.id}>
              {g.fullName}
            </option>
          ))}
        </Select>
      </Label>
      <Label>
        Scheduled start
        <Input type="datetime-local" name="scheduledStart" required />
      </Label>
      <Label>
        Scheduled end
        <Input type="datetime-local" name="scheduledEnd" required />
      </Label>
      <Button type="submit" size="sm" loading={pending}>
        Add shift
      </Button>
      {state.error && <FormError>{state.error}</FormError>}
    </form>
  );
}
