"use client";

import { useActionState } from "react";
import { createSiteAction, type CreateSiteFormState } from "./actions";
import type { ClientRecord } from "@/data/clients";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { FormError, Input, Label, Select } from "@/components/ui/Input";

const initialState: CreateSiteFormState = { error: null };

export function SiteForm({ clients }: { clients: ClientRecord[] }) {
  const [state, formAction, pending] = useActionState(createSiteAction, initialState);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-medium text-[--centrum-text]">Add a site</h2>
      </CardHeader>
      <CardBody>
        <form action={formAction} className="flex flex-wrap items-end gap-4">
          <Label className="min-w-[12rem] flex-1">
            Name
            <Input name="name" required />
          </Label>
          <Label className="min-w-[14rem] flex-1">
            Address
            <Input name="address" required />
          </Label>
          <Label className="min-w-[12rem] flex-1">
            Client
            <Select name="clientId" required defaultValue="">
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Label>
          <Button type="submit" loading={pending}>
            Add site
          </Button>
          {state.error && <FormError>{state.error}</FormError>}
        </form>
      </CardBody>
    </Card>
  );
}
