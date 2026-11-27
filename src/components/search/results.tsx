import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { pluralize } from "@/lib/format";
import type { SearchFilters } from "@/lib/schemas";
import { searchProviders } from "@/server/queries";
import { ClearFiltersButton } from "./clear-filters";
import { ProviderCard } from "./provider-card";

export function hasActiveFilters(f: SearchFilters) {
  return Boolean(f.q || f.categoria || f.cidade);
}

export async function Results({ filters, totalApproved }: { filters: SearchFilters; totalApproved: number }) {
  const providers = await searchProviders(filters);
  const active = hasActiveFilters(filters);
  const n = providers.length;

  return (
    <>
      <div className="mt-6 mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 aria-live="polite">
          {n === 0 ? "Nenhum profissional encontrado" : `${n} ${pluralize(n, "profissional encontrado", "profissionais encontrados")}`}
        </h2>
        {active && <ClearFiltersButton ordem={filters.ordem} />}
      </div>

      {n === 0 ? (
        <EmptyState
          icon="🔍"
          title={totalApproved ? "Ninguém com esses filtros ainda" : "Ainda não há profissionais cadastrados"}
          actions={
            <>
              {active && <ClearFiltersButton ordem={filters.ordem} />}
              <Link href="/cadastro" className={buttonClasses({ variant: "accent" })}>
                Sou prestador, quero me cadastrar
              </Link>
            </>
          }
        >
          {totalApproved
            ? "Tente outra palavra, outra cidade ou limpe os filtros."
            : "Seja o primeiro a divulgar seu trabalho por aqui."}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(270px,1fr))]">
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} />
          ))}
        </div>
      )}
    </>
  );
}

export function ResultsSkeleton() {
  return (
    <>
      <div className="mt-6 mb-4 flex items-center justify-between gap-4">
        <h2 aria-live="polite">Carregando profissionais…</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(270px,1fr))]">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i} className="overflow-hidden p-0">
            <div className="skeleton aspect-[16/10] w-full rounded-none" />
            <div className="flex flex-col gap-2 px-5 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6">
              <div className="skeleton h-3.5 w-2/5" />
              <div className="skeleton h-[18px] w-3/4" />
              <div className="skeleton h-3.5 w-[55%]" />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
