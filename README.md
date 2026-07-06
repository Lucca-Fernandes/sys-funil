# meeventos — Gestão de Fundo de Funil

Sistema web para os **closers** cadastrarem e acompanharem a recuperação de
clientes de fundo de funil. Arquitetura separada em dois serviços:

```
Funil/
├─ frontend/   Next.js (UI, SSR, apresentação parallax) — só interface
└─ backend/    Express + TypeScript + Prisma — API, banco, autenticação
```

O **frontend** não acessa o banco: ele fala com o **backend** por HTTP. O backend
é o dono do Prisma, das regras de negócio e da autenticação (JWT em cookie httpOnly).

---

## Rodar localmente

Pré-requisitos: Node 20+, e um PostgreSQL (o `.env` já aponta para um Neon).

**1) Backend** (porta 4000):
```bash
cd backend
npm install            # gera o Prisma Client automaticamente (postinstall)
npm run db:seed        # popula closers + gestor (senha padrão do .env)
npm run dev
```

**2) Frontend** (porta 3000), em outro terminal:
```bash
cd frontend
npm install
npm run dev
```

Acesse **http://localhost:3000**. Login de demo: `sara@meeventos.com` / `senha123`
(troca de senha obrigatória no 1º acesso). Gestor: `admin@meeventos.com`.

---

## Variáveis de ambiente

Cada serviço tem seu `.env` (veja os `.env.example`). Os essenciais:

**backend/.env**
| var | o quê |
|-----|-------|
| `DATABASE_URL` / `DIRECT_URL` | Postgres (com pool / direta p/ CLI) |
| `JWT_SECRET` | segredo dos JWT — **o mesmo no frontend** |
| `FRONTEND_ORIGIN` | origem do frontend, p/ o CORS (ex.: `https://app.seudominio.com`) |
| `PORT` | porta do backend (4000) |
| `COOKIE_SAMESITE` / `COOKIE_SECURE` / `COOKIE_DOMAIN` | atributos do cookie em produção |

**frontend/.env**
| var | o quê |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | URL do backend vista pelo browser |
| `API_INTERNAL_URL` | URL do backend para chamadas SSR (server→server) |
| `JWT_SECRET` | mesmo do backend (aqui só **verifica** o cookie no proxy.ts) |

---

## Hospedar (produção)

São **dois deploys**: um do `frontend/` (ex.: Vercel) e um do `backend/`
(ex.: Render/Railway — comando `npm start`, healthcheck em `/health`).

⚠️ **Importante — cookie de sessão.** A autenticação usa cookie httpOnly. Para o
frontend (SSR) conseguir ler o cookie que o backend seta, os dois precisam
**compartilhar o domínio-pai**. Recomendado:

- frontend em `app.seudominio.com`, backend em `api.seudominio.com`
- no backend: `COOKIE_DOMAIN=.seudominio.com`, `COOKIE_SAMESITE=lax`, `COOKIE_SECURE=true`
- `FRONTEND_ORIGIN=https://app.seudominio.com`
- no frontend: `NEXT_PUBLIC_API_URL=https://api.seudominio.com`

Se hospedar em domínios totalmente diferentes (ex.: `*.vercel.app` + `*.onrender.com`),
o cookie vira cross-site: use `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true` — mas aí
o SSR do frontend não lê o cookie; prefira o domínio-pai comum acima.

> Rotacione `JWT_SECRET` e a senha do banco antes de ir para produção.
