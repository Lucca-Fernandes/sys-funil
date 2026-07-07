import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth";

/**
 * Sessão atual, revalidada no banco: um closer removido ou desativado perde o
 * acesso na hora (mesmo com JWT ainda válido), e `isAdmin` vem sempre do banco
 * — promoção/rebaixamento valem imediatamente, sem esperar o token expirar.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
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

/** Sessão de gestor. Retorna null para não-admins. */
export async function getAdminSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  return session?.isAdmin ? session : null;
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
