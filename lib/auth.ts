// JWT (assinado com jose, HS256) para sessão em cookie httpOnly.
// Compatível com o Edge Runtime (usado no middleware).
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE = "ff_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 dias

export interface SessionPayload {
  sub: string; // closerId
  nome: string;
  email: string;
  mustChangePassword: boolean;
  /** Gestor: acessa o painel /admin. */
  isAdmin: boolean;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não está definido no ambiente.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    nome: payload.nome,
    email: payload.email,
    mustChangePassword: payload.mustChangePassword,
    isAdmin: payload.isAdmin,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify<JWTPayload & Omit<SessionPayload, "sub">>(
      token,
      getSecret(),
      { algorithms: ["HS256"] },
    );
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      nome: String(payload.nome ?? ""),
      email: String(payload.email ?? ""),
      mustChangePassword: Boolean(payload.mustChangePassword),
      isAdmin: Boolean(payload.isAdmin),
    };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_DURATION_SECONDS;
