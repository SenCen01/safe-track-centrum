"use client";

import { useActionState } from "react";
import { createCheckpointAction, type CreateCheckpointFormState } from "./actions";
import { Button } from "@/components/ui/Button";
import { FormError, Input, Label } from "@/components/ui/Input";

const initialState: CreateCheckpointFormState = { error: null };

export function CheckpointForm({ siteId, routeId }: { siteId: string; routeId: string }) {
  const [state, formAction, pending] = useActionState(createCheckpointAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-4 rounded-xl bg-surface-alt p-4">
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="routeId" value={routeId} />
      <Label className="min-w-[10rem] flex-1">
        Name
        <Input name="name" required />
      </Label>
      <Label className="min-w-[10rem] flex-1">
        QR code
        <Input name="qrCode" required />
      </Label>
      <Button type="submit" size="sm" loading={pending}>
        Add checkpoint
      </Button>
      {state.error && <FormError>{state.error}</FormError>}
    </form>
  );
}
