// Middlewares de autenticação/autorização.
import type { Request, Response, NextFunction } from "express";
import { resolveSession } from "@/lib/session";
import type { SessionPayload } from "@/lib/auth";

// Anexa `req.session` a todas as requisições (via declaration merging).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionPayload | null;
    }
  }
}

/** Popula req.session (ou null). Nunca bloqueia — só resolve. */
export async function attachSession(req: Request, _res: Response, next: NextFunction) {
  try {
    req.session = await resolveSession(req);
  } catch {
    req.session = null;
  }
  next();
}

/** Exige sessão válida. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session) return res.status(401).json({ error: "Não autenticado" });
  next();
}

/** Exige sessão de gestor. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session) return res.status(401).json({ error: "Não autenticado" });
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: "Acesso restrito ao gestor." });
  }
  next();
}

/**
 * Bloqueia quem ainda precisa trocar a senha (mustChangePassword). Aplicado às
 * rotas de dados — as de auth (trocar senha / logout / me) ficam liberadas.
 */
export function denyIfMustChange(req: Request, res: Response, next: NextFunction) {
  if (req.session?.mustChangePassword) {
    return res.status(403).json({ error: "Troca de senha obrigatória." });
  }
  next();
}
