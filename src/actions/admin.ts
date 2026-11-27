"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { firstErrors, idSchema, loginSchema } from "@/lib/schemas";
import type { ActionResult } from "@/lib/types";
import { getAdmin, loginAdmin, logoutAdmin } from "@/server/auth";
import * as db from "@/server/mutations";
import { clientIp, rateLimit, TOO_MANY } from "@/server/rate-limit";

const EXPIRED = "Sua sessão expirou. Entre de novo para continuar.";
const NOT_FOUND = "Registro não encontrado (talvez já tenha sido removido).";

/* ---------------- Sessão ---------------- */

export async function login(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Confira os campos.", fieldErrors: firstErrors(parsed.error) };
  }
  // 10 tentativas / 15 min por IP e 5 por e-mail (em memória); a conta ainda trava no banco após 5 erros seguidos.
  if (
    !rateLimit(`login-ip:${await clientIp()}`, 10, 15 * 60_000) ||
    !rateLimit(`login-email:${parsed.data.email}`, 5, 15 * 60_000)
  ) {
    return { ok: false, message: TOO_MANY };
  }
  try {
    const auth = await loginAdmin(parsed.data.email, parsed.data.password);
    // Conta bloqueada por falhas seguidas responde igual ao limitador de tentativas:
    // quem não é o admin não consegue distinguir "e-mail existe" de "e-mail não existe".
    if (!auth.ok && auth.reason === "locked") return { ok: false, message: TOO_MANY };
    if (!auth.ok) {
      return { ok: false, message: "E-mail ou senha incorretos.", fieldErrors: { password: "E-mail ou senha incorretos." } };
    }
  } catch (err) {
    console.error("[login]", err);
    return { ok: false, message: "Não foi possível entrar agora. Tente de novo." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function logout(): Promise<ActionResult> {
  await logoutAdmin();
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ---------------- Moderação ---------------- */

const moderationStatus = z.enum(["approved", "rejected", "paused"]);

export async function setProviderStatus(id: unknown, status: unknown): Promise<ActionResult> {
  if (!(await getAdmin())) return { ok: false, message: EXPIRED };
  const parsedId = idSchema.safeParse(id);
  const parsedStatus = moderationStatus.safeParse(status);
  if (!parsedId.success || !parsedStatus.success) return { ok: false, message: "Dados inválidos." };
  if (!(await db.updateProviderStatus(parsedId.data, parsedStatus.data))) return { ok: false, message: NOT_FOUND };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteProvider(id: unknown): Promise<ActionResult> {
  return remove(id, db.deleteProvider);
}
export async function deleteReview(id: unknown): Promise<ActionResult> {
  return remove(id, db.deleteReview);
}
export async function deleteQuote(id: unknown): Promise<ActionResult> {
  return remove(id, db.deleteQuote);
}

async function remove(id: unknown, fn: (id: string) => Promise<boolean>): Promise<ActionResult> {
  if (!(await getAdmin())) return { ok: false, message: EXPIRED };
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, message: "Dados inválidos." };
  if (!(await fn(parsed.data))) return { ok: false, message: NOT_FOUND };
  revalidatePath("/", "layout");
  return { ok: true };
}
