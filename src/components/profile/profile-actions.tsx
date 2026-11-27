"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { submitQuote } from "@/actions/engagement";
import { Button, buttonClasses } from "@/components/ui/button";
import { InnerBox } from "@/components/ui/card";
import { Required, SelectField, TextareaField, TextField } from "@/components/ui/fields";
import { DocIcon, ShareIcon, WhatsAppIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/providers";
import { WHEN_OPTIONS } from "@/lib/constants";
import { maskPhone } from "@/lib/format";
import { firstErrors, quoteSchema } from "@/lib/schemas";
import { quoteMessage, whatsappLink } from "@/lib/whatsapp";

type Props = {
  provider: { id: string; name: string; category: string; whatsapp: string };
  /** Só prestadores aprovados recebem pedidos de orçamento. */
  canQuote: boolean;
};

const empty = { clientName: "", clientPhone: "", neighborhood: "", preferredWhen: WHEN_OPTIONS[0] as string, details: "" };

/** Botões de ação do perfil + formulário "Pedir orçamento" (abre o WhatsApp já com a mensagem escrita). */
export function ProfileActions({ provider, canQuote }: Props) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const firstName = provider.name.split(" ")[0];

  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: k === "clientPhone" ? maskPhone(e.target.value) : e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: "" }));
  };

  function openBox() {
    setOpen(true);
    setDone(false);
    setTimeout(() => {
      box.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      box.current?.querySelector<HTMLInputElement>("#qName")?.focus({ preventScroll: true });
    }, 50);
  }

  async function share() {
    const url = `${location.origin}/prestador/${provider.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${provider.name} — Chama Aí`, text: `${provider.name} · ${provider.category}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast("Link do perfil copiado!", "success");
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") toast(`Não foi possível copiar. Link: ${url}`);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = quoteSchema.safeParse({ providerId: provider.id, ...form });
    if (!parsed.success) {
      const errs = firstErrors(parsed.error);
      setErrors(errs);
      const first = Object.keys(errs)[0];
      if (first) (e.currentTarget as HTMLFormElement).querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    const q = parsed.data;
    // window.open precisa rodar DENTRO do clique/envio (antes de qualquer await), senão o navegador bloqueia o popup.
    window.open(whatsappLink(provider, quoteMessage(provider.name, q)), "_blank", "noopener");
    // A cópia para o admin é "melhor esforço": se falhar, o cliente já está no WhatsApp.
    startTransition(async () => {
      await submitQuote(q).catch((err) => console.warn("Cópia do orçamento não salva:", err));
    });
    setForm(empty);
    setErrors({});
    setDone(true);
  }

  return (
    <>
      <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap print:hidden">
        <a href={whatsappLink(provider)} target="_blank" rel="noopener" className={buttonClasses({ variant: "wa" })}>
          <WhatsAppIcon />
          Chamar no WhatsApp
        </a>
        {canQuote && (
          <Button variant="accent" onClick={openBox}>
            <DocIcon />
            Pedir orçamento
          </Button>
        )}
        <Button variant="ghost" onClick={share}>
          <ShareIcon />
          Compartilhar
        </Button>
      </div>

      {open && (
        <div ref={box} className="mt-8 scroll-mt-4">
          <InnerBox>
            <h2>Pedir orçamento</h2>
            <p className="mt-1 mb-4 text-[13px] text-muted">
              Preencha e a gente abre o WhatsApp de {firstName} com seu pedido já escrito. É só tocar em enviar.
            </p>
            {done && (
              <div className="mb-4 rounded-lg border border-[#bbf7d0] bg-success-soft px-4 py-3 text-sm font-medium text-[#166534]" role="status">
                ✅ Pronto! O WhatsApp foi aberto com seu pedido. É só tocar em enviar por lá.
              </div>
            )}
            <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField id="qName" name="clientName" maxLength={80} autoComplete="name" label={<>Seu nome <Required /></>} value={form.clientName} onChange={set("clientName")} error={errors.clientName} />
              <TextField id="qPhone" name="clientPhone" inputMode="tel" placeholder="(89) 99999-9999" label={<>Seu telefone <span className="text-muted">(opcional)</span></>} value={form.clientPhone} onChange={set("clientPhone")} error={errors.clientPhone} />
              <TextField id="qHood" name="neighborhood" maxLength={60} label={<>Seu bairro <Required /></>} value={form.neighborhood} onChange={set("neighborhood")} error={errors.neighborhood} />
              <SelectField id="qWhen" name="preferredWhen" label="Para quando?" value={form.preferredWhen} onChange={set("preferredWhen")}>
                {WHEN_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </SelectField>
              <TextareaField id="qDet" name="details" maxLength={1000} placeholder="Ex: trocar 3 tomadas e instalar um chuveiro novo na casa." className="md:col-span-2" label={<>O que você precisa? <Required /></>} value={form.details} onChange={set("details")} error={errors.details} />
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-4 md:col-span-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="wa" type="submit">
                  <WhatsAppIcon />
                  Enviar pelo WhatsApp
                </Button>
              </div>
            </form>
          </InnerBox>
        </div>
      )}
    </>
  );
}
