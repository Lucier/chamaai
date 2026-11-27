import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettierRecommended from 'eslint-plugin-prettier/recommended'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // As fotos já são reduzidas no navegador e servidas por /uploads; o otimizador do next/image não agrega aqui.
      '@next/next/no-img-element': 'off',
    },
  },
  // Sempre por último: desliga as regras de estilo do ESLint que conflitam com o Prettier (eslint-config-prettier)
  // e liga `prettier/prettier`, que lê o .prettierrc.json. Assim `eslint --fix` também formata.
  prettierRecommended,
  globalIgnores(['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts', 'uploads/**']),
])
