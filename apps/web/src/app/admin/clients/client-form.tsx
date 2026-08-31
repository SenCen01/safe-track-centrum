"use client";

import { useActionState } from "react";
import { createClientAction, type CreateClientFormState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { FormError, Input, Label } from "@/components/ui/Input";

const initialState: CreateClientFormState = { error: null };

export function ClientForm() {
  const [state, formAction, pending] = useActionState(createClientAction, initialState);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-medium text-[--centrum-text]">Add a client</h2>
      </CardHeader>
      <CardBody>
        <form action={formAction} className="flex flex-wrap items-end gap-4">
          <Label className="min-w-[12rem] flex-1">
            Name
            <Input name="name" required />
          </Label>
          <Label className="min-w-[10rem] flex-1">
            Contact name
            <Input name="contactName" />
          </Label>
          <Label className="min-w-[12rem] flex-1">
            Contact email
            <Input name="contactEmail" type="email" />
          </Label>
          <Label className="w-40">
            Contact phone
            <Input name="contactPhone" />
          </Label>
          <Button type="submit" loading={pending}>
            Add client
          </Button>
          {state.error && <FormError>{state.error}</FormError>}
        </form>
      </CardBody>
    </Card>
  );
}
