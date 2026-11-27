"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { SORT_LABEL, SORT_VALUES } from "@/lib/constants";
import type { SearchFilters as Filters } from "@/lib/schemas";
import { CLEAR_SEARCH_EVENT, searchHref } from "@/lib/search-url";
import { SelectField, TextField } from "@/components/ui/fields";

type Props = { filters: Filters; categories: string[]; cities: string[] };

export function SearchFilters({ filters, categories, cities }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const qRef = useRef(q);
  const filtersRef = useRef(filters);
  // Textos que EU já mandei para a URL e que ainda não voltaram nas props (a navegação é assíncrona).
  const pushedQ = useRef<string[]>([]);

  useEffect(() => {
    filtersRef.current = filters;
    // A URL mudou. Se for o eco de uma busca que eu mesmo disparei, não mexo no campo (o usuário pode já
    // ter digitado mais). Se for externa (clique no logo, botão voltar/avançar), alinho o campo com a URL.
    const i = pushedQ.current.indexOf(filters.q);
    if (i >= 0) {
      pushedQ.current = pushedQ.current.slice(i + 1);
    } else if (filters.q !== qRef.current) {
      clearTimeout(timer.current);
      pushedQ.current = [];
      qRef.current = filters.q;
      setQ(filters.q);
    }
  }, [filters]);

  const go = (patch: Partial<Filters>) => {
    const next = { ...filtersRef.current, q: qRef.current, ...patch };
    pushedQ.current.push(next.q);
    startTransition(() => router.replace(searchHref(next), { scroll: false }));
  };

  // O botão "Limpar filtros" (fora deste componente) avisa por evento para zerar o campo de texto.
  useEffect(() => {
    const onClear = () => {
      clearTimeout(timer.current);
      pushedQ.current = [];
      qRef.current = "";
      setQ("");
    };
    window.addEventListener(CLEAR_SEARCH_EVENT, onClear);
    return () => {
      window.removeEventListener(CLEAR_SEARCH_EVENT, onClear);
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className="relative z-[1] mt-5 grid grid-cols-1 gap-3 min-[30rem]:grid-cols-2 min-[30rem]:gap-4 md:mt-6 wide:grid-cols-[2fr_1.2fr_1fr_1fr] [&_label]:text-[#e3f0f1]">
      <TextField
        id="fQ"
        type="search"
        label="O que você precisa?"
        placeholder="Ex: trocar chuveiro, faxina, conserto de ar…"
        autoComplete="off"
        className="min-[30rem]:col-span-2 wide:col-span-1"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          qRef.current = e.target.value;
          clearTimeout(timer.current);
          timer.current = setTimeout(() => go({}), 180);
        }}
      />
      <SelectField id="fCat" label="Categoria" value={filters.categoria} onChange={(e) => go({ categoria: e.target.value })}>
        <option value="">Todas</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </SelectField>
      <SelectField id="fCity" label="Cidade" value={filters.cidade} onChange={(e) => go({ cidade: e.target.value })}>
        <option value="">Todas</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </SelectField>
      <SelectField id="fSort" label="Ordenar por" value={filters.ordem} onChange={(e) => go({ ordem: e.target.value as Filters["ordem"] })}>
        {SORT_VALUES.map((v) => (
          <option key={v} value={v}>
            {SORT_LABEL[v]}
          </option>
        ))}
      </SelectField>
    </div>
  );
}
