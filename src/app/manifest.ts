import type { MetadataRoute } from "next";

/** Manifest do PWA — o Next serve em /manifest.webmanifest e já coloca o <link rel="manifest"> no <head>. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Chama Aí — Profissionais de confiança",
    short_name: "Chama Aí",
    description:
      "Encontre eletricistas, diaristas, encanadores e outros profissionais da sua cidade e fale direto pelo WhatsApp.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7f8",
    theme_color: "#0f6b73",
    categories: ["business", "lifestyle", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Tela cheia, com o glifo dentro da zona segura: o Android aplica a máscara (círculo, quadrado arredondado…).
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Sou prestador — cadastrar serviço",
        short_name: "Cadastrar",
        url: "/cadastro",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
