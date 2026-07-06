// Sessão no Express: lê/grava o cookie httpOnly `ff_session` e revalida no banco.
import type { Request, Response } from "express";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth";
import { cookieOptions } from "@/env";

/**
 * Sessão atual, revalidada no banco: um closer removido ou desativado perde o
 * acesso na hora (mesmo com JWT ainda válido), e `isAdmin` vem sempre do banco.
 */
export async function resolveSession(req: Request): Promise<SessionPayload | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const closer = await prisma.closer.findUnique({
    where: { id: payload.sub },
    select: { ativo: true, isAdmin: true },
  });
  if (!closer || !closer.ativo) return null;

  return { ...payload, isAdmin: closer.isAdmin };
}

export async function setSessionCookie(res: Response, payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    path: "/",
    maxAge: SESSION_MAX_AGE * 1000, // express usa milissegundos
    ...cookieOptions(),
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/", ...cookieOptions() });
}
