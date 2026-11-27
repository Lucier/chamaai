"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { logout } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { PrintIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/providers";

export function AdminToolbar() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(() => {
            router.refresh();
            toast("Dados atualizados.");
          })
        }
      >
        Atualizar
      </Button>
      <Button variant="ghost" size="sm" onClick={() => window.print()}>
        <PrintIcon />
        Imprimir / PDF
      </Button>
      <Button
        variant="ghostDanger"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await logout();
            toast("Você saiu do painel.");
          })
        }
      >
        Sair
      </Button>
    </div>
  );
}
