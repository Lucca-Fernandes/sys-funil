// Base do backend + helpers de fetch usados no browser (client components) e
// para montar URLs de <img>/<a> que o navegador resolve. Não importa next/headers,
// então é seguro em client E server components.
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** URL absoluta de um caminho da API (para <img src>, <a href>, fetch). */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/** fetch no browser com credenciais — envia o cookie de sessão cross-origin. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), { ...init, credentials: "include" });
}
