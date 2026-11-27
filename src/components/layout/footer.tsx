import Link from "next/link";
import { InstallButton } from "./pwa";

export function Footer() {
  return (
    <footer className="border-t border-line bg-white py-6 text-[13px] text-muted print:hidden">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-2 px-4 text-center sm:flex-row sm:flex-wrap sm:gap-4 sm:text-left">
        {/* Celular: botão com rótulo por extenso. No desktop o cabeçalho já tem o dele. */}
        <InstallButton className="md:hidden" />
        <span>© {new Date().getFullYear()} Chama Aí · Profissionais de confiança da sua cidade</span>
        <span>
          É prestador?{" "}
          <Link href="/cadastro" className="font-semibold text-primary no-underline">
            Cadastre-se grátis
          </Link>
        </span>
      </div>
    </footer>
  );
}
