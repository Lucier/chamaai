import clsx from "clsx";
import { categoryIcon } from "@/lib/constants";
import { formatBRL, hashColor, initials, isPriceOnRequest } from "@/lib/format";
import type { Provider } from "@/lib/types";

/** Foto de capa; sem foto, mostra um bloco colorido com o ícone da categoria e as iniciais. */
export function Cover({ provider, className }: { provider: Pick<Provider, "photos" | "name" | "category">; className?: string }) {
  const src = provider.photos[0];
  if (src) {
    return (
      <img
        src={src}
        alt={`Foto de ${provider.name}`}
        loading="lazy"
        className={clsx("block w-full bg-[#e8eef0] object-cover", className)}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={clsx("relative flex w-full items-center justify-center text-[46px]", className)}
      style={{ background: hashColor(provider.category) }}
    >
      {categoryIcon(provider.category)}
      <span className="absolute right-3 bottom-2.5 text-[13px] font-bold text-ink/45">{initials(provider.name)}</span>
    </div>
  );
}

export function Price({ provider, className }: { provider: Pick<Provider, "price">; className?: string }) {
  if (isPriceOnRequest(provider)) {
    return (
      <div className={clsx("leading-tight", className)}>
        <small className="block text-xs text-muted">Preço</small>
        <strong className="text-[15px]">A combinar</strong>
      </div>
    );
  }
  return (
    <div className={clsx("leading-tight", className)}>
      <small className="block text-xs text-muted">a partir de</small>
      <strong className="text-lg">{formatBRL(provider.price)}</strong>
    </div>
  );
}
