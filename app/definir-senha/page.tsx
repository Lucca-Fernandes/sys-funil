"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import ParallaxBackground from "@/components/ParallaxBackground";

export default function DefinirSenhaPage() {
  const router = useRouter();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (novaSenha !== confirmar) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }
    setCarregando(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível trocar a senha.");
        return;
      }
      router.replace("/dashboard");
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
          <Logo size={52} withWordmark={false} />
          <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink">
            Defina sua nova senha
          </h1>
          <p className="mt-1 text-sm font-medium text-ink-soft">
            Por segurança, troque a senha padrão antes de continuar.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="glass space-y-4 rounded-3xl border border-white/10 p-7 card-elev"
        >
          {erro && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {erro}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-semibold text-ink" htmlFor="atual">
              Senha atual
            </label>
            <input
              id="atual"
              type="password"
              autoComplete="current-password"
              required
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-ink" htmlFor="nova">
              Nova senha
            </label>
            <input
              id="nova"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-ink-soft">Mínimo de 6 caracteres.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-ink" htmlFor="confirmar">
              Confirmar nova senha
            </label>
            <input
              id="confirmar"
              type="password"
              autoComplete="new-password"
              required
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-xl bg-brand-gradient px-4 py-2.5 font-semibold text-white shadow-brand transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
          >
            {carregando ? "Salvando…" : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
