"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import ParallaxBackground from "@/components/ParallaxBackground";

// Só aceita caminho interno absoluto: barra a raiz de open redirect
// ("//evil.com", "/\\evil.com", "https:evil"). Senão, cai no dashboard.
function destinoSeguro(next: string | null): string {
  if (!next || next[0] !== "/" || next[1] === "/" || next[1] === "\\") return "/dashboard";
  return next;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível entrar.");
        return;
      }
      if (data.mustChangePassword) {
        router.replace("/definir-senha");
      } else {
        router.replace(destinoSeguro(params.get("next")));
      }
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-white/5 px-4 py-2.5 text-ink outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15";

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <ParallaxBackground variant="auth" />

      <div className="w-full max-w-md animate-rise">
        <div className="mb-7 flex flex-col items-center text-center">
          <Logo size={56} withWordmark={false} />
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink">
            mee<span className="text-gradient-brand">ventos</span>
          </h1>
          <p className="mt-1 text-sm font-medium text-ink-soft">Gestão de Fundo de Funil</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="glass space-y-4 rounded-3xl border border-white/10 p-7 card-elev"
        >
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Bem-vindo de volta</h2>
            <p className="text-sm text-ink-soft">Entre com sua conta de closer.</p>
          </div>

          {erro && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {erro}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-semibold text-ink" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="sara@meeventos.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-ink" htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={inputCls}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-xl bg-brand-gradient px-4 py-2.5 font-semibold text-white shadow-brand transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
          >
            {carregando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
