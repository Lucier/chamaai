"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { SearchFilters } from "@/lib/schemas";
import { CLEAR_SEARCH_EVENT, searchHref } from "@/lib/search-url";

export function ClearFiltersButton({ ordem, className }: { ordem: SearchFilters["ordem"]; className?: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => {
        window.dispatchEvent(new Event(CLEAR_SEARCH_EVENT));
        // limpar filtros mantém a ordenação escolhida
        startTransition(() => router.replace(searchHref({ q: "", categoria: "", cidade: "", ordem }), { scroll: false }));
      }}
    >
      Limpar filtros
    </Button>
  );
}
