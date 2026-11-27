import clsx from "clsx";
import type { ReactNode } from "react";

/** Classes do "chip" (filtro em forma de pílula). Use direto em <Link>. */
export function chipClasses(active: boolean) {
  return clsx(
    "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium whitespace-nowrap transition pointer-coarse:min-h-11",
    active ? "border-primary bg-primary text-white" : "border-line bg-white hover:border-primary hover:text-primary",
  );
}

/**
 * Faixa de chips com rolagem horizontal. No celular ela "sangra" até a borda da tela (-mx-4 compensa o
 * padding do <main>), então os chips deslizam até o canto em vez de serem cortados com uma folga de 16px.
 */
export function ChipRow({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div
      aria-label={label}
      className={clsx("chip-row -mx-4 flex gap-2 overflow-x-auto px-4 pt-1 pb-2 md:mx-0 md:px-0.5 print:hidden", className)}
    >
      {children}
    </div>
  );
}
