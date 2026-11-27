# Chama Aí

Catálogo de profissionais de confiança da sua cidade (eletricista, diarista, encanador…) com contato direto
pelo WhatsApp, avaliações e painel de aprovação para o administrador.

Conversão do protótipo `chama-ai.html` (HTML único + Supabase) para uma aplicação completa:

| Camada          | Tecnologia                                                          |
| --------------- | ------------------------------------------------------------------- |
| App / UI        | **Next.js 16** (App Router, Server Components, Server Actions), React 19 |
| Estilo          | **Tailwind CSS 4** (tokens do protótipo em `src/app/globals.css`)   |
| Validação       | **Zod 4** — os mesmos schemas validam no navegador e no servidor    |
| Banco           | **PostgreSQL 17** (`pg`, SQL puro, migrações em `db/migrations`)    |
| Runtime         | **Node.js 24**                                                      |
| Infra           | **Docker** / Docker Compose (imagem `standalone`, não-root)         |
| Testes          | Vitest (regras de negócio, schemas, uploads, senha)                 |

## Rodando

### Com Docker (app + banco + migração)

```bash
cp .env.example .env        # ajuste POSTGRES_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD e gere o JWT_SECRET (openssl rand -base64 48)
docker compose up -d --build
```

Sobe nesta ordem: `db` (Postgres) → `migrate` (aplica as migrações e cria/atualiza o admin, depois termina) → `app`
em <http://localhost:3000>. Dados ficam nos volumes `pgdata` (banco) e `uploads` (fotos) e sobrevivem a `docker compose down`
(só `down -v` apaga).

Dados de exemplo (os mesmos 11 prestadores do protótipo), opcional e **só para teste**:

```bash
docker compose run --rm migrate npm run db:seed
```

### Desenvolvimento local

```bash
cp .env.example .env
docker compose up -d db     # só o Postgres (exposto em 127.0.0.1:5432)
npm install
npm run db:migrate          # cria as tabelas
npm run admin:create        # cria o admin com ADMIN_EMAIL / ADMIN_PASSWORD do .env
npm run db:seed             # (opcional) dados de exemplo
npm run dev                 # http://localhost:3000
```

Outros scripts: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
Criar outro admin: `npm run admin:create -- ana@exemplo.com "uma-senha-forte"`.

## Variáveis de ambiente

| Variável            | Padrão        | Para quê                                                              |
| ------------------- | ------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`      | —             | Conexão Postgres (o compose monta sozinho para o container `app`)     |
| `UPLOAD_DIR`        | `./uploads`   | Pasta das fotos (`/data/uploads`, um volume, no Docker)               |
| `COOKIE_SECURE`     | `false`       | **Use `true` em produção com HTTPS**, senão o login não é "secure"    |
| `SESSION_TTL_DAYS`  | `7`           | Duração da sessão do admin (validade do JWT)                          |
| `JWT_SECRET`        | —             | **Obrigatória** (≥ 32 caracteres) para o app. Assina o JWT do admin. Gere com `openssl rand -base64 48`; trocar desloga todos os admins. Não é usada por `migrate`/`seed` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | —| Admin criado pelo `migrate`/`admin:create` (senha nova: ≥ 10 caracteres, até 72 bytes, com letras e números, sem conter o e-mail). O `.env` é a fonte da verdade: com a mesma senha rodar de novo não muda nada; com outra, redefine a senha e **encerra todas as sessões** |

## Telas e rotas (do HTML para o Next)

| Tela do protótipo        | Rota                          | Observações                                                                                   |
| ------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------- |
| Aba "Encontrar serviço"  | `/`                           | Filtros no URL (`?q=&categoria=&cidade=&ordem=`) — compartilháveis, voltar/avançar funcionam |
| Modal de perfil          | `/prestador/[id]`             | **Rota interceptada**: abre como modal por cima da busca/admin e, em link direto/recarga, vira página cheia |
| Aba "Sou prestador"      | `/cadastro`                   | Fotos reduzidas no navegador (1280 px, JPEG) antes do envio                                    |
| Aba "Admin" (login + painel) | `/admin?aba=…`            | `aba` = `pendentes` (padrão), `aprovados`, `outros`, `avaliacoes`, `orcamentos`                |
| Estados de erro / vazio  | `error.tsx`, `not-found.tsx`, estados em `results.tsx` | Mesmos textos do protótipo                                       |

Funcionalidades preservadas: busca sem acento com todas as palavras, ordenação (nota, menor preço com "a combinar" no fim, recentes),
chips com contagem, "pedir orçamento" (abre o WhatsApp com a mensagem pronta e guarda uma cópia para o admin), compartilhar
(Web Share / copiar link), avaliações com distribuição por estrelas (uma por aparelho), moderação (aprovar, recusar, pausar,
reativar, excluir com confirmação), apagar avaliações/orçamentos, impressão/PDF do painel, layout responsivo.

## PWA (app instalável)

O Chama Aí pode ser instalado na tela inicial do celular ou como app no desktop.

| Peça | Onde | Para quê |
| --- | --- | --- |
| Manifest | `src/app/manifest.ts` (servido em `/manifest.webmanifest`) | nome, cores, `display: standalone`, ícones e atalho "Cadastrar" |
| Ícones | `public/icons/*.png`, `src/app/apple-icon.png` | 192/512 (`any`), 512 `maskable` (Android) e 180 opaco (iOS) |
| Service worker | `public/sw.js` | exigido para instalar; mostra `public/offline.html` sem internet |
| Botão "Instalar app" | `src/components/layout/pwa.tsx`, `src/lib/pwa-install.ts` | no cabeçalho e no rodapé (celular). Usa o prompt nativo quando o navegador oferece; **em qualquer navegador de celular, mesmo sem prompt** (http, iPhone, Firefox…), abre um passo a passo do navegador |

- **Ícone na barra de endereços**: é do navegador (Chrome/Edge no desktop). Ele aparece sozinho quando o app cumpre os critérios acima. No Chrome do
  Android a instalação fica no menu ⋮ → *Instalar app*; por isso o app também tem o próprio botão.
- **Botão no celular sem HTTPS**: ele aparece mesmo em `http://192.168.x.x:3000`, mas sem HTTPS o navegador só consegue criar um **atalho** na tela inicial
  (abre dentro do navegador); a instalação como app de verdade e o modo offline exigem HTTPS. No desktop o botão só aparece quando o navegador oferece instalar.
- **Precisa de HTTPS** (ou `localhost`) para instalar de verdade. Abrir pelo IP da rede, como `http://192.168.x.x:3000`, **não** instala nem registra o service worker.
  Para o celular, use o HTTPS local da seção abaixo.
- **Cache**: o service worker nunca guarda páginas (o conteúdo é dinâmico e o `/admin` depende de sessão). Só guarda `/_next/static/*` (arquivos com hash)
  e a página offline. Ao mudar `public/sw.js` ou `public/offline.html`, aumente `VERSION` em `sw.js`.
- **Só em produção**: o registro do service worker é desligado em `npm run dev`.
- **Trocar o ícone**: edite os SVGs em `scripts/icons/` e rode `sh scripts/icons/generate.sh` (precisa do ImageMagick).
- O `Dockerfile` copia `public/` para a imagem final; sem isso o service worker e os ícones dariam 404.

## HTTPS local (para instalar o PWA no celular)

Um proxy [Caddy](https://caddyserver.com) (serviço `proxy`, perfil `https` do compose) termina o TLS com um certificado de uma **CA local sua**.

```bash
bash scripts/https/setup.sh        # gera a CA (uma vez) e o certificado com o IP atual da máquina
echo 'COMPOSE_PROFILES=https' >> .env   # já liga o proxy no `docker compose up -d`
docker compose up -d
```

| Endereço | O que é |
| --- | --- |
| `https://<ip>:8443` | o app por HTTPS (HTTP/2) — é este que permite **instalar** |
| `http://<ip>:8080` | página para **baixar e instalar a CA** no celular (só serve `ca.crt` e a página) |
| `http://<ip>:3000` | o app sem HTTPS, como antes |

**No celular** (mesmo Wi-Fi): abra `http://<ip>:8080`, baixe e instale o certificado (a página traz o passo a passo de Android e iPhone) e depois abra
`https://<ip>:8443`. O certificado se instala **uma vez só**. O Android exige tela de bloqueio configurada para aceitar certificado de CA.

- **IP mudou** (o roteador renovou o endereço)? Rode `bash scripts/https/setup.sh` de novo e `docker compose restart proxy`. A CA é mantida, então o celular
  continua confiando; só o certificado do servidor é refeito. Nomes/IPs extras: `bash scripts/https/setup.sh 192.168.1.50 meu-pc.local`.
- **Validade**: o certificado do servidor vale 365 dias (a Apple recusa mais de 825); a CA, 10 anos. O `setup.sh` mostra a data de vencimento.
- **Segurança**: a CA só vale para IPs privados, `localhost` e `*.local` (*name constraints*): se `certs/ca/ca.key` vazar, ela ainda não emite certificado
  para `google.com`. Essa chave **nunca** vai para o container nem para a pasta servida na 8080. Mesmo assim, guarde-a e não a versione — `certs/` está no
  `.gitignore` e no `.dockerignore`. Se perdê-la, apague `certs/` e rode o script de novo (e reinstale a CA no celular).
- **Cookie de sessão**: recebe o atributo `Secure` automaticamente quando a requisição chega por HTTPS (`X-Forwarded-Proto`), sem precisar de `COOKIE_SECURE=true`;
  por `http://<ip>:3000` continua funcionando como antes.
- **Remover**: apague a CA nas configurações de certificados do celular e `docker compose --profile https down` (ou tire `COMPOSE_PROFILES` do `.env`).
- Só testa/desenvolve na máquina: **não use esta CA em produção**. Em produção, use um domínio real com certificado público (Let's Encrypt).

## Login do admin

- **Senha**: guardada só como hash **bcrypt** (custo 12, sal próprio por hash). Nunca é criptografada de forma reversível, então
  ninguém — nem quem acessa o banco — consegue "descriptografar" uma senha. Hashes antigos (scrypt) continuam valendo e são
  trocados por bcrypt no primeiro login. O bcrypt só lê os 72 primeiros bytes, por isso a política recusa senhas maiores.
- **Sessão**: cookie `httpOnly` + `SameSite=Lax` com um **JWT HS256** (`jose`) assinado com `JWT_SECRET`, com `iss`, `aud`, `exp`,
  `jti` e `ver`. A verificação aceita só HS256 (nunca `alg: none`).
- **Revogação**: o JWT sozinho não basta. O banco guarda o *hash* do `jti` em `admin_sessions`; o logout apaga a linha e o mesmo token
  deixa de valer. `admins.token_version` invalida todos os tokens quando a senha muda.
- **Força bruta**: 5 senhas erradas seguidas bloqueiam a conta por 15 min (no banco, sobrevive a reinício), além do limite por IP/e-mail
  em memória. Conta bloqueada responde igual a "muitas tentativas", sem revelar se o e-mail existe.
- **Autorização**: todo acesso restrito passa por `getAdmin()`/`requireAdmin()` (nega por padrão). `getAdminData()` exige admin por conta
  própria, mesmo que uma página esqueça de checar.
- **Trocar a senha**: edite `ADMIN_PASSWORD` no `.env` e rode `docker compose up -d` (ou `npm run admin:create`).

## O que mudou em relação ao protótipo

O Supabase fazia três trabalhos que agora são do código:

- **Auth do admin** → tabelas `admins` / `admin_sessions`. Veja a seção abaixo.
- **RLS** → regras em `src/actions/*` e `src/server/*`: o público só enxerga prestadores `approved`; só admin altera/exclui;
  avaliação e orçamento só para prestador aprovado; toda Server Action valida a entrada com Zod e checa a sessão.
- **Storage** → fotos em `UPLOAD_DIR`, servidas por `/uploads/[...path]`. O servidor confere o formato pelos *bytes* (JPEG/PNG/WebP),
  limita a 2 MB por foto/4 fotos e bloqueia path traversal.

Outras mudanças:

- O **modo demonstração** (dados em `localStorage`, senha `admin123`) foi removido; `npm run db:seed` o substitui.
- "Uma avaliação por aparelho" usa um cookie `httpOnly` (antes, `localStorage`). Continua sendo uma barreira leve, não anti-fraude.
- Links antigos `#prestador/<id>` viraram `/prestador/<id>`.

## Estrutura

```
db/migrations/        SQL versionado (tabela schema_migrations controla o que já rodou)
scripts/              migrate, seed, create-admin (rodam com tsx; também dentro do Docker)
src/app/              rotas (page/layout), @modal (modal interceptado), /uploads, /api/health
src/actions/          Server Actions (mutations): providers, engagement, admin
src/server/           db, auth, queries, mutations, uploads, rate-limit (só no servidor)
src/lib/              constantes, formatação, schemas Zod, URL da busca (compartilhado cliente/servidor)
src/components/       ui/, layout/, search/, profile/, register/, admin/
```

## Limitações conhecidas / próximos passos

- **Sem paginação**: a busca lista todos os aprovados (igual ao protótipo). Com centenas de prestadores, pagine em `searchProviders`.
- **Rate limit em memória**: vale por instância. Com mais de uma réplica, troque por um limitador compartilhado (Redis/Postgres).
- **Fotos em disco local**: com várias réplicas, use volume compartilhado ou um storage S3-compatível.
- Sem tela para trocar a senha do admin (use `npm run admin:create`) nem recuperação de senha.
- Sem Content-Security-Policy (os demais cabeçalhos de segurança estão em `next.config.ts`).
- Os arquivos `chama-ai.html` e `supabase-setup.sql` originais foram mantidos na raiz, intocados.
