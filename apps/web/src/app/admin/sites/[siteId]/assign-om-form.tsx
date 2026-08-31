"use client";

import { useActionState } from "react";
import { assignOperationsManagerAction, type AssignOmFormState } from "./actions";
import type { OperationsManagerRecord } from "@/data/operations-managers";
import { Button } from "@/components/ui/Button";
import { FormError, Label, Select } from "@/components/ui/Input";

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
    <form action={formAction} className="flex flex-wrap items-end gap-4 rounded-xl bg-surface-alt p-4">
      <input type="hidden" name="siteId" value={siteId} />
      <Label className="min-w-[12rem] flex-1">
        Operations Manager
        <Select name="operationsManagerId" required defaultValue="">
          <option value="">Select…</option>
          {operationsManagers.map((om) => (
            <option key={om.id} value={om.id}>
              {om.fullName}
            </option>
          ))}
        </Select>
      </Label>
      <Button type="submit" size="sm" loading={pending}>
        Assign
      </Button>
      {state.error && <FormError>{state.error}</FormError>}
    </form>
  );
}
