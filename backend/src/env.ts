// Configuração central do backend, lida de variáveis de ambiente.
// Em dev, o `import "dotenv/config"` (no server.ts) carrega o .env; em produção
// a plataforma de hospedagem injeta as variáveis direto no process.env.

export const env = {
  port: Number(process.env.PORT ?? 4000),
  // Origem exata do frontend, para o CORS com credenciais (cookie).
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  isProd: process.env.NODE_ENV === "production",
};

/**
 * Atributos do cookie de sessão conforme o ambiente.
 * - Dev (mesmo site localhost, http): SameSite=Lax, Secure=false.
 * - Prod cross-site (domínios diferentes): defina COOKIE_SAMESITE=none e
 *   COOKIE_SECURE=true. Se front e back dividem o mesmo domínio-pai, use
 *   COOKIE_SAMESITE=lax e COOKIE_DOMAIN=.seudominio.com.
 */
export function cookieOptions() {
  const sameSite = (process.env.COOKIE_SAMESITE ?? "lax").toLowerCase() as
    | "lax"
    | "strict"
    | "none";
  const secure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true"
      : sameSite === "none";
  const domain = process.env.COOKIE_DOMAIN || undefined;
  return { sameSite, secure, domain };
}

export function assertEnv(): void {
  for (const name of ["DATABASE_URL", "JWT_SECRET"]) {
    if (!process.env[name]) throw new Error(`Variável de ambiente ${name} não definida.`);
  }
}
