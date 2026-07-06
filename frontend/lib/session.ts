// Sessão do frontend: verifica o JWT do cookie (sem tocar o banco — o backend
// é o guardião real). Usada nos Server Components para decisões de UI/redirect.
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken, type SessionPayload } from "@/lib/auth";

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Sessão de gestor. Retorna null para não-admins. */
export async function getAdminSession(): Promise<SessionPayload | null> {
  const s = await getSession();
  return s?.isAdmin ? s : null;
}
