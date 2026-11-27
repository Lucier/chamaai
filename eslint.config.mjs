import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // As fotos já são reduzidas no navegador e servidas por /uploads; o otimizador do next/image não agrega aqui.
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "node_modules/**", "next-env.d.ts", "uploads/**"]),
]);
