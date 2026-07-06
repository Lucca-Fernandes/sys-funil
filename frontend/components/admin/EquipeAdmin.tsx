"use client";
import { apiFetch } from "@/lib/api";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type CloserAdminDTO = {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  isAdmin: boolean;
  leads: number;
  recuperados: number;
  taxa: number; // 0–1
  interesse: number; // 0–100
};

type SenhaGerada = { nome: string; email: string; senha: string };

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-card p-6 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-card-2 px-3.5 py-2 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15";

export default function EquipeAdmin({
  closers,
  meuId,
}: {
  closers: CloserAdminDTO[];
  meuId: string;
}) {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<SenhaGerada | null>(null);
  const [confirmando, setConfirmando] = useState<{ id: string; acao: "toggle" | "reset" } | null>(
    null,
  );
  const [copiado, setCopiado] = useState(false);

  async function criar() {
    if (salvando) return;
    setErro(null);
    setSalvando(true);
    try {
      const res = await apiFetch("/api/admin/closers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível criar o acesso.");
        return;
      }
      setCriando(false);
      setNome("");
      setEmail("");
      setSenhaGerada({ nome: data.closer.nome, email: data.closer.email, senha: data.senhaTemporaria });
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  async function executarAcao(c: CloserAdminDTO, acao: "toggle" | "reset") {
    setConfirmando(null);
    const body = acao === "toggle" ? { ativo: !c.ativo } : { resetarSenha: true };
    const res = await apiFetch(`/api/admin/closers/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok && acao === "reset") {
      setSenhaGerada({ nome: c.nome, email: c.email, senha: data.senhaTemporaria });
    }
    router.refresh();
  }

  async function copiarSenha() {
    if (!senhaGerada) return;
    await navigator.clipboard.writeText(senhaGerada.senha);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1600);
  }

  return (
    <div className="glass rounded-3xl border border-white/10 p-6 card-elev">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Equipe</h2>
          <p className="text-xs text-ink-soft">
            Crie acessos, desative quem saiu e resete senhas. Dados de closers desativados são
            preservados.
          </p>
        </div>
        <button
          onClick={() => setCriando(true)}
          className="rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-brand transition hover:brightness-105"
        >
          + Novo closer
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-ink-soft">
              <th className="pb-2 pr-3 font-semibold">Closer</th>
              <th className="pb-2 pr-3 font-semibold">Status</th>
              <th className="pb-2 pr-3 text-right font-semibold">Leads</th>
              <th className="pb-2 pr-3 text-right font-semibold">Recup.</th>
              <th className="pb-2 pr-3 text-right font-semibold">Taxa</th>
              <th className="pb-2 pr-3 text-right font-semibold">Interesse</th>
              <th className="pb-2 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {closers.map((c) => (
              <tr key={c.id} className={c.ativo ? "" : "opacity-50"}>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/closers/${c.id}/avatar`}
                      alt={c.nome}
                      className="h-9 w-9 rounded-xl object-cover ring-1 ring-white/15"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ink">
                        {c.nome}
                        {c.isAdmin && (
                          <span className="ml-1.5 rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-400">
                            gestor
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-ink-soft">{c.email}</div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      c.ativo ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {c.ativo ? "Ativo" : "Desativado"}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right font-semibold text-ink">{c.leads}</td>
                <td className="py-2.5 pr-3 text-right font-semibold text-emerald-400">
                  {c.recuperados}
                </td>
                <td className="py-2.5 pr-3 text-right font-semibold text-ink">
                  {Math.round(c.taxa * 100)}%
                </td>
                <td className="py-2.5 pr-3 text-right font-semibold text-ink">{c.interesse}%</td>
                <td className="py-2.5 text-right">
                  {confirmando?.id === c.id ? (
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className="text-ink-soft">
                        {confirmando.acao === "toggle"
                          ? c.ativo
                            ? "Desativar?"
                            : "Reativar?"
                          : "Nova senha?"}
                      </span>
                      <button
                        onClick={() => executarAcao(c, confirmando.acao)}
                        className="rounded-lg bg-brand-500 px-2 py-1 font-bold text-white hover:bg-brand-600"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmando(null)}
                        className="rounded-lg border border-white/10 px-2 py-1 font-semibold text-ink-soft hover:bg-white/5"
                      >
                        Não
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex gap-1.5">
                      <button
                        onClick={() => setConfirmando({ id: c.id, acao: "reset" })}
                        className="rounded-lg border border-white/10 px-2 py-1 text-xs font-semibold text-ink-soft transition hover:bg-white/5 hover:text-ink"
                        title="Gerar nova senha temporária"
                      >
                        Resetar senha
                      </button>
                      {c.id !== meuId && (
                        <button
                          onClick={() => setConfirmando({ id: c.id, acao: "toggle" })}
                          className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                            c.ativo
                              ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                              : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                          }`}
                        >
                          {c.ativo ? "Desativar" : "Reativar"}
                        </button>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {criando && (
        <Modal onClose={() => setCriando(false)}>
          <h3 className="font-display text-xl font-bold text-ink">Novo closer</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Uma senha temporária será gerada — o closer troca no primeiro acesso.
          </p>
          {erro && (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {erro}
            </div>
          )}
          <div className="mt-4 space-y-3">
            <input
              autoFocus
              placeholder="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={inputCls}
            />
            <input
              placeholder="email@meeventos.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && criar()}
              className={inputCls}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setCriando(false)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              onClick={criar}
              disabled={salvando || !nome.trim() || !email.trim()}
              className="rounded-xl bg-brand-gradient px-5 py-2 text-sm font-semibold text-white shadow-brand transition hover:brightness-105 disabled:opacity-60"
            >
              {salvando ? "Criando…" : "Criar acesso"}
            </button>
          </div>
        </Modal>
      )}

      {senhaGerada && (
        <Modal onClose={() => setSenhaGerada(null)}>
          <h3 className="font-display text-xl font-bold text-ink">Acesso pronto ✓</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Envie estes dados para <strong className="text-ink">{senhaGerada.nome}</strong>. A
            senha aparece <strong className="text-ink">só desta vez</strong> e deverá ser trocada
            no primeiro acesso.
          </p>
          <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-ink-soft">E-mail</span>
              <span className="font-semibold text-ink">{senhaGerada.email}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-soft">Senha temporária</span>
              <span className="font-mono text-base font-bold text-brand-400">
                {senhaGerada.senha}
              </span>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={copiarSenha}
              className="rounded-xl border border-brand-500/40 px-4 py-2 text-sm font-semibold text-brand-400 transition hover:bg-brand-500/10"
            >
              {copiado ? "Copiado ✓" : "Copiar senha"}
            </button>
            <button
              onClick={() => setSenhaGerada(null)}
              className="rounded-xl bg-brand-gradient px-5 py-2 text-sm font-semibold text-white shadow-brand"
            >
              Concluir
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
