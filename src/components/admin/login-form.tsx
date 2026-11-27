"use client";

import { useState, useTransition, type FormEvent } from "react";
import { login } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Required, TextField } from "@/components/ui/fields";
import { useToast } from "@/components/ui/providers";
import { firstErrors, loginSchema } from "@/lib/schemas";

export function LoginForm() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setErrors(firstErrors(parsed.error));
    startTransition(async () => {
      const res = await login({ email, password }).catch(() => null);
      if (!res) return setErrors({ password: "Sem conexão com o servidor. Tente de novo." });
      if (!res.ok) return setErrors(res.fieldErrors ?? { password: res.message });
      toast("Bem-vindo ao painel!", "success");
      // a página /admin é revalidada pela própria action e passa a mostrar o painel
    });
  }

  return (
    <Card className="mx-auto mt-6 max-w-[420px]">
      <form onSubmit={onSubmit} noValidate>
        <h1>Área do administrador</h1>
        <p className="mt-1.5 mb-6 text-muted">Entre para aprovar cadastros e acompanhar o app.</p>
        <div className="flex flex-col gap-4">
          <TextField id="lEmail" name="email" type="email" autoComplete="username" placeholder="voce@email.com"
            label={<>E-mail <Required /></>} value={email} error={errors.email}
            onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: "" })); }} />
          <TextField id="lPass" name="password" type="password" autoComplete="current-password"
            label={<>Senha <Required /></>} value={password} error={errors.password}
            onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: "" })); }} />
          <Button type="submit" block disabled={pending}>
            {pending ? "Entrando…" : "Entrar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
