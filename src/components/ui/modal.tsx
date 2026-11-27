"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * Modal do perfil. É renderizado pela rota interceptada (@modal/(.)prestador/[id]),
 * então tem URL própria: dá para compartilhar, recarregar e voltar com o botão do navegador.
 */
export function Modal({ children, label = "Perfil do prestador" }: { children: ReactNode; label?: string }) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.back();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [router]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(e) => e.target === e.currentTarget && router.back()}
      className="fixed inset-0 z-[60] flex animate-fade-in items-start justify-center overflow-y-auto overscroll-contain bg-[rgba(10,30,35,0.55)] p-0 md:px-4 md:py-8 print:static print:bg-transparent print:p-0"
    >
      <div className="relative min-h-full w-full max-w-[820px] animate-rise bg-card shadow-modal md:min-h-0 md:rounded-xl print:max-w-none print:shadow-none">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Fechar"
          className="absolute top-3 right-3 z-[3] grid size-11 place-items-center rounded-full bg-white/95 text-[22px] leading-none text-ink shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition hover:brightness-90 print:hidden"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
