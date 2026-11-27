"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockIcon, SearchIcon, UserPlusIcon } from "@/components/ui/icons";

const tabs = [
  { href: "/", label: "Encontrar serviço", Icon: SearchIcon, match: (p: string) => p === "/" || p.startsWith("/prestador") },
  { href: "/cadastro", label: "Sou prestador", Icon: UserPlusIcon, match: (p: string) => p.startsWith("/cadastro") },
  { href: "/admin", label: "Admin", Icon: LockIcon, match: (p: string) => p.startsWith("/admin") },
];

export function NavTabs({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções" className="flex gap-1 px-2 md:px-0">
      {tabs.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              // Celular: ícone em cima do rótulo, as 3 abas dividem a largura (cabem até em 320px; antes a 3ª ficava cortada).
              "relative flex min-h-12 flex-auto flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-center text-[11px] leading-tight font-semibold transition",
              // Desktop: ícone ao lado do rótulo, abas com largura do conteúdo.
              "md:min-h-11 md:flex-none md:flex-row md:gap-2 md:px-4 md:py-2.5 md:text-sm md:leading-normal md:whitespace-nowrap",
              active ? "bg-primary-soft text-primary" : "text-muted hover:bg-[#f1f5f6] hover:text-ink",
            )}
          >
            <Icon className="size-5 md:size-[17px]" />
            {label}
            {href === "/admin" && pendingCount > 0 && (
              // Celular: selo no canto do ícone. Desktop: ao lado do rótulo.
              <span
                className="absolute top-0.5 left-1/2 ml-1.5 min-w-5 rounded-full bg-accent px-[7px] py-px text-center text-[11px] leading-snug font-bold text-white md:static md:ml-0"
                aria-label={`${pendingCount} cadastros pendentes`}
              >
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
