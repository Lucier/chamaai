import clsx from "clsx";
import type { HTMLAttributes } from "react";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("print-card rounded-xl bg-card p-5 shadow-card md:p-6", className)} {...rest} />;
}

/** Caixa interna cinza-clara (formulários dentro do perfil, dicas etc.). */
export function InnerBox({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("print-card rounded-xl border border-line bg-[#f8fafb] p-4 sm:p-5 md:p-6", className)} {...rest} />;
}

export function EmptyState({
  icon,
  title,
  children,
  actions,
  className,
}: {
  icon: string;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={clsx("px-6 py-12 text-center", className)}>
      <div className="mb-2 text-[42px]" aria-hidden>
        {icon}
      </div>
      <h2>{title}</h2>
      {children && <p className="mx-auto mt-2 mb-4 max-w-[420px] text-muted">{children}</p>}
      {actions && <div className="flex flex-wrap items-center justify-center gap-4">{actions}</div>}
    </Card>
  );
}
