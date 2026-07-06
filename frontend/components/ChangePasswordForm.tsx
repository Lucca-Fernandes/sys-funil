"use client";
import { apiFetch } from "@/lib/api";

import { useState } from "react";

export default function ChangePasswordForm() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setMsg(null);
    if (novaSenha !== confirmar) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }
    setSalvando(true);
    try {
      const res = await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível trocar a senha.");
        return;
      }
      setMsg("Senha alterada com sucesso.");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmar("");
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-card-2 px-3.5 py-2 text-ink outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100";

  return (
    <form onSubmit={onSubmit} className="max-w-sm space-y-4">
      {erro && <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</div>}
      {msg && <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{msg}</div>}

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Senha atual</label>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Nova senha</label>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">
          Confirmar nova senha
        </label>
        <input
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
        disabled={salvando}
        className="rounded-xl bg-brand-gradient px-5 py-2 text-sm font-semibold text-white shadow-brand transition hover:brightness-105 disabled:opacity-60"
      >
        {salvando ? "Salvando…" : "Trocar senha"}
      </button>
    </form>
  );
}
