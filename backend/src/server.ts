import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env, assertEnv } from "@/env";
import { attachSession } from "@/middleware/auth";

import authRouter from "@/routes/auth";
import clientesRouter from "@/routes/clientes";
import categoriasRouter from "@/routes/categorias";
import colunasRouter from "@/routes/colunas";
import closersRouter from "@/routes/closers";
import profileRouter from "@/routes/profile";
import adminRouter from "@/routes/admin";
import viewsRouter from "@/routes/views";

assertEnv();

const app = express();

// Atrás de proxy (Render/Railway/etc): confia no X-Forwarded-* para cookie Secure.
app.set("trust proxy", 1);

// CORS com credenciais: só a origem do frontend, cookies liberados.
app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(attachSession);

// Healthcheck (para a plataforma de hospedagem).
app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/clientes", clientesRouter);
app.use("/api/categorias", categoriasRouter);
app.use("/api/colunas", colunasRouter);
app.use("/api/closers", closersRouter);
app.use("/api/profile", profileRouter);
app.use("/api/admin", adminRouter);
app.use("/api/views", viewsRouter);

// 404 para rotas desconhecidas.
app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada." }));

// Handler central de erros: NUNCA devolve stack/detalhe ao cliente.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as { type?: string; code?: string; status?: number; statusCode?: number };

  if (e?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Requisição inválida." });
  }
  if (e?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "Imagem muito grande (máx. 4 MB)." });
  }

  const status = e?.status ?? e?.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500) {
    return res.status(status).json({ error: "Requisição inválida." });
  }

  // Erro inesperado: loga só no servidor (host), resposta genérica ao cliente.
  console.error("[erro]", err);
  res.status(500).json({ error: "Erro interno do servidor." });
});

app.listen(env.port, () => {
  // Log de inicialização (apenas no host, nunca exposto ao usuário).
  console.log(`API meeventos ouvindo em http://localhost:${env.port} (origem permitida: ${env.frontendOrigin})`);
});
