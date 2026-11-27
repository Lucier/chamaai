import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

// whitespace-nowrap só a partir de sm: em telas de 320px um rótulo longo precisa poder quebrar em vez de vazar do cartão.
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg text-center font-semibold leading-[1.2] no-underline transition active:translate-y-px disabled:opacity-50 disabled:hover:brightness-100 sm:whitespace-nowrap [&_svg]:size-[18px] [&_svg]:shrink-0";

const variants = {
  primary: "bg-primary text-white hover:brightness-90",
  accent: "bg-accent text-white hover:brightness-90",
  wa: "bg-wa text-white hover:brightness-90",
  success: "bg-success text-white hover:brightness-90",
  danger: "bg-danger text-white hover:brightness-90",
  ghost: "border border-line bg-white text-primary hover:border-[#c9dfe1] hover:bg-primary-soft",
  ghostDanger: "border border-[#f3c4c4] bg-white text-danger hover:bg-danger-soft",
} as const;

// min-h-11 = 44px, o alvo de toque mínimo recomendado (Apple HIG / Material 48dp ≈ 44–48px).
// O "sm" só cresce em telas de toque (pointer-coarse) para o desktop continuar compacto.
const sizes = {
  md: "min-h-11 px-5 py-3 text-[15px] sm:px-6",
  sm: "px-3.5 py-2 text-[13px] pointer-coarse:min-h-11 [&_svg]:size-[15px]",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

/** Classes do botão — use direto em <Link>/<a> para ter o mesmo visual. */
export function buttonClasses(opts: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string } = {}) {
  const { variant = "primary", size = "md", block, className } = opts;
  return clsx(base, variants[variant], sizes[size], block && "w-full", className);
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
};

export function Button({ variant, size, block, className, type = "button", ...rest }: Props) {
  return <button type={type} className={buttonClasses({ variant, size, block, className })} {...rest} />;
}
