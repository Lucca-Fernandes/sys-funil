"use client";

import { useEffect, useMemo, useState } from "react";
import { SEGMENTOS, SEGMENTO_PADRAO } from "@/config/segmentos";
import {
  CHECKLIST_FIELDS,
  GRUPOS_ORDEM,
  RESPONSAVEL_COR,
  itensPorGrupo,
} from "@/config/checklist";
import { calcularScore } from "@/lib/score";
import type { ClienteDTO, ClienteFormValues, ColunaDTO } from "@/lib/types";
import ContatosWidget from "@/components/widgets/ContatosWidget";
import CanaisWidget from "@/components/widgets/CanaisWidget";
import ScoreBar from "@/components/ScoreBar";

function valoresIniciais(cliente: ClienteDTO | null, colunaIdInicial: string | null): ClienteFormValues {
  const checklist = Object.fromEntries(
    CHECKLIST_FIELDS.map((f) => [f, cliente ? cliente[f] : false]),
  ) as Pick<ClienteFormValues, (typeof CHECKLIST_FIELDS)[number]>;

  return {
    nome: cliente?.nome ?? "",
    segmento: cliente?.segmento ?? SEGMENTO_PADRAO,
    linkCliente: cliente?.linkCliente ?? "",
    anotacoes: cliente?.anotacoes ?? "",
    contatosRealizados: cliente?.contatosRealizados ?? 0,
    canais: cliente?.canais ?? [],
    colunaId: cliente?.colunaId ?? colunaIdInicial,
    ...checklist,
  };
}

export default function ClienteModal({
  cliente,
  colunas,
  colunaIdInicial = null,
  onClose,
  onSaved,
  onDeleted,
}: {
  cliente: ClienteDTO | null; // null = novo
  colunas: ColunaDTO[];
  colunaIdInicial?: string | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const editando = cliente !== null;
  const [form, setForm] = useState<ClienteFormValues>(valoresIniciais(cliente, colunaIdInicial));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const score = useMemo(() => calcularScore(form), [form]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function set<K extends keyof ClienteFormValues>(key: K, value: ClienteFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleCanal(key: string) {
    setForm((f) => ({
      ...f,
      canais: f.canais.includes(key) ? f.canais.filter((k) => k !== key) : [...f.canais, key],
    }));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!form.nome.trim()) {
      setErro("O nome é obrigatório.");
      return;
    }
    setSalvando(true);
    try {
      const url = editando ? `/api/clientes/${cliente!.id}` : "/api/clientes";
      const method = editando ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível salvar.");
        return;
      }
      onSaved();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!editando) return;
    setSalvando(true);
    try {
      const res = await fetch(`/api/clientes/${cliente!.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.error ?? "Não foi possível excluir.");
        return;
      }
      onDeleted();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-card-2 px-3.5 py-2 text-ink outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="my-8 w-full max-w-2xl rounded-3xl border border-white/10 bg-card p-6 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">
            {editando ? "Editar lead" : "Novo lead"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-ink-soft transition hover:bg-white/5 hover:text-ink"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {erro && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {erro}
          </div>
        )}

        <form onSubmit={salvar} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-ink">Nome *</label>
              <input
                className={inputCls}
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">Segmento</label>
              <select
                className={inputCls}
                value={form.segmento}
                onChange={(e) => set("segmento", e.target.value)}
              >
                {SEGMENTOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">Coluna do quadro</label>
              <select
                className={inputCls}
                value={form.colunaId ?? ""}
                onChange={(e) => set("colunaId", e.target.value || null)}
              >
                {colunas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titulo}
                    {c.chave ? " *" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-ink">Link do cliente</label>
              <input
                className={inputCls}
                value={form.linkCliente ?? ""}
                onChange={(e) => set("linkCliente", e.target.value)}
                placeholder="https://…"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-ink">
                Anotações (como foram os retornos)
              </label>
              <textarea
                className={`${inputCls} min-h-24 resize-y`}
                value={form.anotacoes ?? ""}
                onChange={(e) => set("anotacoes", e.target.value)}
              />
            </div>
          </div>

          {/* Widgets de progresso */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ContatosWidget
              value={form.contatosRealizados}
              onChange={(v) => set("contatosRealizados", v)}
            />
            <CanaisWidget selecionados={form.canais} onToggle={toggleCanal} />
          </div>

          {/* Checklist agrupado */}
          <div className="space-y-4">
            <h3 className="font-display text-base font-bold text-ink">Checklist de qualificação</h3>
            {GRUPOS_ORDEM.map((grupo) => (
              <fieldset key={grupo} className="rounded-2xl border border-line bg-white/[.03] p-4">
                <legend className="px-1 text-xs font-bold uppercase tracking-wide text-brand-400">
                  {grupo}
                </legend>
                <div className="space-y-1.5">
                  {itensPorGrupo(grupo).map((item) => (
                    <label
                      key={item.field}
                      className="flex cursor-pointer items-start gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-400"
                        checked={form[item.field]}
                        onChange={(e) => set(item.field, e.target.checked)}
                      />
                      <span>
                        <span className={`text-sm font-medium ${RESPONSAVEL_COR[item.responsavel]}`}>
                          {item.label}
                        </span>
                        {item.peso < 0 && (
                          <span className="ml-1 text-xs font-semibold text-red-500">(−)</span>
                        )}
                        {item.descricao && (
                          <span className="block text-xs text-ink-soft">{item.descricao}</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          {/* Score de interesse de compra (calculado do checklist) */}
          <ScoreBar score={score} />

          <div className="flex items-center justify-between pt-1">
            <div>
              {editando &&
                (confirmandoExclusao ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink-soft">Excluir?</span>
                    <button
                      type="button"
                      onClick={excluir}
                      disabled={salvando}
                      className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      Sim, excluir
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmandoExclusao(false)}
                      className="rounded-xl px-3 py-1.5 text-sm text-ink-soft hover:bg-white/5"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmandoExclusao(true)}
                    className="rounded-xl px-3 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-500/10"
                  >
                    Excluir
                  </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="rounded-xl bg-brand-gradient px-5 py-2 text-sm font-semibold text-white shadow-brand transition hover:brightness-105 disabled:opacity-60"
              >
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
