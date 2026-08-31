"use client";

import Image from "next/image";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { FormError, Input, Label } from "@/components/ui/Input";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-surface-alt px-4">
      <div className="flex flex-col items-center gap-3">
        <Image src="/images/logos/icon_logo.png" alt="" width={64} height={64} priority />
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[--centrum-text]">
          Safe Track Centrum
        </h1>
      </div>
      <Card className="w-full max-w-sm">
        <CardBody>
          <form action={formAction} className="flex flex-col gap-4">
            <Label>
              Email
              <Input type="email" name="email" required autoComplete="email" />
            </Label>
            <Label>
              Password
              <Input type="password" name="password" required autoComplete="current-password" />
            </Label>
            {state.error && <FormError>{state.error}</FormError>}
            <Button type="submit" size="full" loading={pending}>
              Sign in
            </Button>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
