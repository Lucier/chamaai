import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";

export default function NotFound() {
  return (
    <EmptyState
      icon="🧭"
      title="Página não encontrada"
      actions={
        <Link href="/" className={buttonClasses()}>
          Ver o catálogo
        </Link>
      }
    >
      Esse endereço não existe ou o perfil não está mais disponível.
    </EmptyState>
  );
}
