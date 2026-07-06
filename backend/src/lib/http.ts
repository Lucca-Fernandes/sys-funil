// Utilitários HTTP para os routers.
import type { Request, Response, NextFunction, RequestHandler } from "express";

/** Envolve um handler async: erros vão para o error handler central (server.ts). */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** ID do closer logado (garantido por requireAuth). */
export function closerId(req: Request): string {
  return req.session!.sub;
}

/** Parâmetro de rota como string (Express 5 tipa params como string | string[]). */
export function param(req: Request, name: string): string {
  const v = (req.params as Record<string, unknown>)[name];
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

/** Query string como string, ou undefined se ausente. */
export function queryStr(req: Request, name: string): string | undefined {
  const v = (req.query as Record<string, unknown>)[name];
  if (v === undefined) return undefined;
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}
