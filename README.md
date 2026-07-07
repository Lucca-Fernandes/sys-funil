# meeventos — Gestão de Fundo de Funil

Sistema web para os **closers** cadastrarem e acompanharem a recuperação de
clientes de fundo de funil, com painel de **gestão** (equipe, relatórios e
exportações) e apresentação de resultados.

Aplicação **Next.js full-stack**: as páginas são renderizadas no servidor e a
API (rotas `/api/*`) roda no mesmo projeto. O acesso ao banco (Prisma), as
regras de negócio e a autenticação (JWT em cookie httpOnly) vivem **apenas no
servidor** — o navegador recebe só a interface.

```
app/          páginas (SSR) + rotas de API
components/   componentes de interface
lib/          autenticação, sessão, regras de negócio
config/       checklist, segmentos, canais, colunas
prisma/       schema, migrações e seed de onboarding
```

---

## Rodar localmente

Pré-requisitos: Node 20+ e um banco PostgreSQL. Copie `.env.example` para
`.env` e preencha as variáveis.

```bash
npm install        # instala e gera o Prisma Client
npm run db:migrate # aplica as migrações no banco
npm run db:seed    # cria a conta inicial do gestor (SEED_ADMIN_*)
npm run dev        # http://localhost:3000
```

## Variáveis de ambiente

| var | o quê |
|-----|-------|
| `DATABASE_URL` | Postgres com pool — usada pela aplicação em runtime |
| `DIRECT_URL` | Postgres direta — usada pelo Prisma CLI (migrate/seed) |
| `JWT_SECRET` | segredo que assina os JWT do cookie de sessão |
| `SEED_ADMIN_NAME` / `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | conta inicial do gestor criada pelo `db:seed` |

## Fluxo de acesso

1. O **gestor** entra com a conta criada pelo seed.
2. No painel **/admin**, cria o acesso de cada closer — o sistema gera uma
   **senha temporária**, exibida uma única vez.
3. No primeiro login, o closer é obrigado a **definir a própria senha** antes
   de usar o sistema.
