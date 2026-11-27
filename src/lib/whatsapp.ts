export function whatsappLink(
  provider: { name: string; category: string; whatsapp: string },
  text?: string,
): string {
  const message =
    text ??
    `Olá, ${provider.name}! Encontrei seu perfil no Chama Aí e gostaria de mais informações sobre o serviço de ${provider.category}.`;
  return `https://wa.me/${provider.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

export function quoteMessage(
  providerName: string,
  q: { clientName: string; neighborhood: string; clientPhone?: string | null; preferredWhen: string; details: string },
): string {
  return (
    `*Pedido de orçamento — Chama Aí*\n\n` +
    `Olá, ${providerName}! Vi seu perfil e gostaria de um orçamento.\n\n` +
    `*Nome:* ${q.clientName}\n` +
    `*Bairro:* ${q.neighborhood}` +
    (q.clientPhone ? `\n*Telefone:* ${q.clientPhone}` : "") +
    `\n*Para quando:* ${q.preferredWhen}\n\n` +
    `*O que preciso:*\n${q.details}`
  );
}
