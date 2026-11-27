import type { Metadata } from "next";
import { Card, InnerBox } from "@/components/ui/card";
import { RegisterForm } from "@/components/register/register-form";
import { getAdmin } from "@/server/auth";
import { getCitySuggestions } from "@/server/queries";

export const metadata: Metadata = {
  title: "Sou prestador — divulgue seu serviço grátis",
  description: "Cadastre seu serviço no Chama Aí, seja encontrado por clientes da sua cidade e receba contatos direto no WhatsApp.",
};
export const dynamic = "force-dynamic";

const steps = [
  ["Você se cadastra", "Leva uns 3 minutos e é grátis."],
  ["A gente confere", "Cada cadastro é verificado antes de aparecer, pra deixar o catálogo confiável."],
  ["Clientes te chamam", "Eles falam com você direto pelo WhatsApp e pedem orçamento."],
  ["Boas avaliações te destacam", "Os mais bem avaliados aparecem primeiro na busca."],
] as const;

export default async function RegisterPage() {
  const cities = await getCitySuggestions(Boolean(await getAdmin()));
  return (
    <section aria-labelledby="t-reg" className="grid grid-cols-1 items-start gap-6 wide:grid-cols-[1fr_340px]">
      <RegisterForm cities={cities} />
      <Card>
        <h2>Como funciona</h2>
        <ol className="mt-4 flex list-none flex-col gap-4">
          {steps.map(([title, text], i) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-[13px] font-bold text-primary">{i + 1}</span>
              <div>
                <strong>{title}</strong>
                <div className="text-[13px] text-muted">{text}</div>
              </div>
            </li>
          ))}
        </ol>
        <InnerBox className="mt-6 p-4">
          <strong className="text-[13px]">💡 Dica</strong>
          <p className="mt-1 text-[13px] text-muted">Perfis com fotos reais do seu trabalho recebem muito mais contatos.</p>
        </InnerBox>
      </Card>
    </section>
  );
}
