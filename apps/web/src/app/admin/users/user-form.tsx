"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { createUserAction, type CreateUserFormState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { FormError, Input, Label, Select } from "@/components/ui/Input";

const initialState: CreateUserFormState = { error: null, temporaryPassword: null };

export function UserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, initialState);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader>
          <h2 className="font-medium text-[--centrum-text]">Create a Guard or Operations Manager account</h2>
        </CardHeader>
        <CardBody>
          <form action={formAction} className="flex flex-wrap items-end gap-4">
            <Label className="min-w-[14rem] flex-1">
              Email
              <Input name="email" type="email" required />
            </Label>
            <Label className="min-w-[12rem] flex-1">
              Full name
              <Input name="fullName" required />
            </Label>
            <Label className="w-40">
              Phone
              <Input name="phone" />
            </Label>
            <Label className="w-48">
              Role
              <Select name="role" defaultValue="guard">
                <option value="guard">Guard</option>
                <option value="operations_manager">Operations Manager</option>
              </Select>
            </Label>
            <Button type="submit" loading={pending}>
              Create user
            </Button>
            {state.error && <FormError>{state.error}</FormError>}
          </form>
        </CardBody>
      </Card>
      {state.temporaryPassword && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <KeyRound size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">Account created.</p>
            <p className="mt-0.5">
              Temporary password:{" "}
              <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-amber-900">
                {state.temporaryPassword}
              </code>
            </p>
            <p className="mt-1 text-amber-700">Share this password with the new user — it will not be shown again.</p>
          </div>
        </div>
      )}
    </div>
  );
}
