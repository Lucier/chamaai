"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <EmptyState icon="📡" title="Algo deu errado" actions={<Button onClick={reset}>Tentar de novo</Button>}>
      Não foi possível carregar agora. Confira sua conexão e tente de novo.
    </EmptyState>
  );
}
