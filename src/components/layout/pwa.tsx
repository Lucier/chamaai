"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { InstallIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/providers";
import { getInstallHelp, getInstallState, subscribeInstall, takeInstallPrompt, type InstallHelp } from "@/lib/pwa-install";

/** Registra o service worker. Só em produção: em `next dev` o cache atrapalharia mais do que ajudaria. */
export function PwaRegister() {
  useEffect(() => {
    // `serviceWorker` só existe em contexto seguro (HTTPS ou localhost).
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}

/**
 * Botão "Instalar app". Aparece:
 *  - quando o navegador libera a instalação nativa (abre o prompt dele); ou
 *  - em QUALQUER navegador de celular, mesmo sem prompt (http, iOS, Firefox…): abre o passo a passo.
 * Some se o app já está instalado/aberto como app e, no desktop, quando não há o que instalar.
 *
 * `compact`: no cabeçalho, onde o espaço é curto — só o ícone em telas estreitas e rótulo "Instalar" nas demais.
 */
export function InstallButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  const state = useSyncExternalStore(subscribeInstall, getInstallState, () => "hidden" as const);
  const toast = useToast();
  const [help, setHelp] = useState<InstallHelp | null>(null);

  if (state === "hidden") return null;

  async function install() {
    const prompt = state === "prompt" ? takeInstallPrompt() : null;
    if (!prompt) return setHelp(getInstallHelp());
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") toast("App instalado! Procure o Chama Aí na sua tela inicial.", "success");
    } catch {
      // o prompt nativo falhou: o passo a passo ainda leva o usuário até lá
      setHelp(getInstallHelp());
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" className={className} onClick={install} aria-label="Instalar app">
        <InstallIcon />
        {compact ? <span className="hidden min-[400px]:inline">Instalar</span> : <span>Instalar app</span>}
      </Button>
      {help && <InstallHelpDialog help={help} onClose={() => setHelp(null)} />}
    </>
  );
}

/**
 * Renderizado num portal no <body>: o cabeçalho usa backdrop-filter, que faz um `position: fixed`
 * dentro dele se prender ao cabeçalho em vez de cobrir a tela.
 */
function InstallHelpDialog({ help, onClose }: { help: InstallHelp; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex animate-fade-in items-end justify-center overflow-y-auto bg-[rgba(10,30,35,0.55)] p-4 sm:items-start"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-help-title"
        className="w-full max-w-[420px] animate-rise rounded-xl bg-card p-6 shadow-modal sm:mt-[12vh]"
      >
        <h2 id="install-help-title">Instalar o Chama Aí</h2>
        <p className="mt-1 text-[13px] text-muted">No {help.browser}:</p>
        <ol className="mt-4 flex list-none flex-col gap-3">
          {help.steps.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-[12px] font-bold text-primary">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        {help.note && <p className="mt-4 rounded-lg bg-primary-soft p-3 text-[13px] text-ink">{help.note}</p>}
        <Button block className="mt-6" onClick={onClose} autoFocus>
          Entendi
        </Button>
      </div>
    </div>,
    document.body,
  );
}
