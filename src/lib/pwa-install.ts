/*
 * Estado de instalação do PWA, compartilhado entre componentes.
 *
 * O navegador (Chrome/Edge/Samsung Internet) dispara `beforeinstallprompt` UMA vez, quando o app
 * passa a ser instalável — normalmente antes de a interface terminar de hidratar. Por isso o
 * listener é registrado aqui, no carregamento do módulo, e não dentro de um useEffect: assim o
 * evento não se perde e o botão consegue usá-lo depois.
 *
 * O ícone de instalação da barra de endereços (desktop) e o item "Instalar app" do menu continuam
 * sendo do navegador; o preventDefault() só evita o mini-aviso automático do Android, já que o
 * nosso botão chama o prompt() no clique.
 *
 * Quando NÃO há evento (iOS/Safari nunca tem; Android em http, ou o Chrome sem critérios cumpridos,
 * também não), o botão continua aparecendo em celulares e mostra o passo a passo do navegador
 * (ver buildInstallHelp) — o usuário sempre encontra um caminho para pôr o app na tela inicial.
 */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** "prompt" = o navegador liberou a instalação nativa; "manual" = celular sem prompt (mostra instruções); "hidden" = nada a mostrar. */
export type InstallState = "hidden" | "prompt" | "manual";

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export function subscribeInstall(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Já está rodando como app instalado (janela própria, sem barra do navegador)? */
function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iPadOS 13+ se apresenta como "Macintosh": só o toque múltiplo o denuncia. */
function isIpadOs(): boolean {
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** Celular/tablet? (O "modo desktop" do navegador esconde isso de propósito, e aí o botão também some.) */
export function isMobileUserAgent(ua: string, ipadOs = false): boolean {
  return ipadOs || /android|iphone|ipad|ipod|mobile/i.test(ua);
}

export function getInstallState(): InstallState {
  if (isStandalone()) return "hidden";
  if (deferred) return "prompt";
  return isMobileUserAgent(navigator.userAgent, isIpadOs()) ? "manual" : "hidden";
}

export type InstallHelp = { browser: string; steps: string[]; note?: string };

const NOTE_HTTP =
  "Este endereço usa http, então o navegador só cria um atalho na tela inicial (que abre dentro do navegador). Para instalar como aplicativo de verdade, o site precisa ser aberto por https.";

/** Passo a passo para pôr o app na tela inicial, conforme o navegador. Função pura: recebe o que ler do navegador. */
export function buildInstallHelp({ ua, secure, ipadOs = false }: { ua: string; secure: boolean; ipadOs?: boolean }): InstallHelp {
  // Navegador embutido em outro app (Instagram, Facebook…): não instala nada — precisa abrir no navegador de verdade.
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Snapchat|TikTok|BytedanceWebview|; wv\)/i.test(ua)) {
    return {
      browser: "navegador de dentro de outro app",
      steps: [
        "Toque nos três pontinhos (⋯ ou ⋮) do app em que você abriu este link.",
        "Escolha “Abrir no navegador” (Chrome ou Safari).",
        "Quando abrir lá, toque em “Instalar” de novo.",
      ],
    };
  }
  if (/iphone|ipad|ipod/i.test(ua) || ipadOs) {
    return {
      browser: "iPhone e iPad (Safari, Chrome…)",
      steps: [
        "Toque em Compartilhar (o quadrado com a seta para cima).",
        "Role a lista e toque em “Adicionar à Tela de Início”.",
        "Toque em “Adicionar”.",
      ],
    };
  }
  const note = secure ? undefined : NOTE_HTTP;
  if (/SamsungBrowser/i.test(ua)) {
    return {
      browser: "Samsung Internet",
      steps: ["Toque no menu ≡ (na barra de baixo).", "Toque em “Adicionar página a” e depois em “Tela inicial”.", "Confirme."],
      note,
    };
  }
  if (/Firefox\//i.test(ua)) {
    return {
      browser: "Firefox (Android)",
      steps: ["Toque no menu ⋮.", "Toque em “Instalar” (ou “Adicionar à tela inicial”).", "Confirme."],
      note,
    };
  }
  return {
    browser: "Chrome, Edge e outros (Android)",
    steps: [
      "Toque no menu ⋮ (canto superior direito).",
      "Toque em “Instalar app” ou “Adicionar à tela inicial”.",
      "Confirme.",
    ],
    note,
  };
}

export function getInstallHelp(): InstallHelp {
  return buildInstallHelp({ ua: navigator.userAgent, secure: window.isSecureContext, ipadOs: isIpadOs() });
}

/** Entrega o evento guardado (ele só pode ser usado uma vez). */
export function takeInstallPrompt(): BeforeInstallPromptEvent | null {
  const e = deferred;
  deferred = null;
  emit();
  return e;
}
