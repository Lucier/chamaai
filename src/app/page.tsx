import Link from "next/link";
import { Suspense } from "react";
import { Results, ResultsSkeleton } from "@/components/search/results";
import { ChipRow, chipClasses } from "@/components/ui/chip";
import { SearchFilters } from "@/components/search/search-filters";
import { CATEGORY_NAMES, categoryIcon } from "@/lib/constants";
import { searchParamsSchema, type SearchFilters as Filters } from "@/lib/schemas";
import { searchHref } from "@/lib/search-url";
import { getFilterOptions } from "@/server/queries";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SearchPage({ searchParams }: Props) {
  const parsed: Filters = searchParamsSchema.parse(await searchParams);

  // Opções dos filtros. Valor da URL que não existe mais (ex.: prestador pausado) vira "Todos".
  const options = await getFilterOptions();
  const byCategory = new Map(options.categories.map((c) => [c.name, c.count]));
  const categories = [
    ...CATEGORY_NAMES.filter((c) => byCategory.has(c)),
    ...options.categories.map((c) => c.name).filter((c) => !(CATEGORY_NAMES as readonly string[]).includes(c)),
  ];
  const filters: Filters = {
    ...parsed,
    categoria: categories.includes(parsed.categoria) ? parsed.categoria : "",
    cidade: options.cities.includes(parsed.cidade) ? parsed.cidade : "",
  };

  return (
    <section aria-labelledby="t-search">
      <div className="rounded-xl bg-[linear-gradient(135deg,#0f6b73_0%,#0c5960_60%,#0a4d53_100%)] p-4 text-white shadow-card sm:p-5 md:p-6 relative overflow-hidden after:pointer-events-none after:absolute after:-top-20 after:-right-20 after:size-[280px] after:rounded-full after:bg-white/[0.06] after:content-['']">
        <h1 id="t-search" className="max-w-[640px] text-white">
          Encontre um profissional de confiança perto de você
        </h1>
        <p className="mt-2 max-w-[620px] text-[#cfe5e7]">
          Eletricistas, diaristas, encanadores e muito mais. Veja avaliações, compare preços e fale direto pelo WhatsApp.
        </p>
        <SearchFilters filters={filters} categories={categories} cities={options.cities} />
      </div>

      <ChipRow label="Categorias" className="mt-6">
        <Link
          href={searchHref({ ...filters, categoria: "" })}
          replace
          scroll={false}
          className={chipClasses(!filters.categoria)}
        >
          Todos <span className="text-xs opacity-70">{options.total}</span>
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={searchHref({ ...filters, categoria: c })}
            replace
            scroll={false}
            className={chipClasses(filters.categoria === c)}
          >
            {categoryIcon(c)} {c} <span className="text-xs opacity-70">{byCategory.get(c)}</span>
          </Link>
        ))}
      </ChipRow>

      <Suspense key={JSON.stringify(filters)} fallback={<ResultsSkeleton />}>
        <Results filters={filters} totalApproved={options.total} />
      </Suspense>
    </section>
  );
}
