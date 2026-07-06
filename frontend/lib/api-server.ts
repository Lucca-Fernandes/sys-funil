// Fetch server→backend para os Server Components (SSR): encaminha o cookie de
// sessão do request atual, para o backend autenticar a chamada.
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";

const SERVER_BASE =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function apiServer(path: string, init?: RequestInit): Promise<Response> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return fetch(`${SERVER_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      ...(token ? { cookie: `${SESSION_COOKIE}=${token}` } : {}),
    },
    cache: "no-store",
  });
}

/** Busca JSON já validando o status. `ok` distingue sucesso de 4xx/5xx. */
export async function apiServerJson<T>(
  path: string,
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const res = await apiServer(path);
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}
