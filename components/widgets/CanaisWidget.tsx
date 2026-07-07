"use client";

import { CANAIS, DIVERSIDADE_MIN } from "@/config/channels";

// "Diversidade de canais" — chips de canais; diversidade = nº de tipos distintos.
export default function CanaisWidget({
  selecionados,
  onToggle,
}: {
  selecionados: string[];
  onToggle: (key: string) => void;
}) {
  const qtd = selecionados.length;
  const meta = DIVERSIDADE_MIN;
  const pct = Math.min(100, (qtd / meta) * 100);
  const atingiu = qtd >= meta;

  return (
    <div className="rounded-2xl border border-line bg-card-2 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span
            className={`inline-block h-3 w-3 rounded-full border-2 ${
              atingiu ? "border-emerald-500 bg-emerald-500" : "border-white/25"
            }`}
          />
          Diversidade de canais
        </span>
        <span className={`text-sm font-bold ${atingiu ? "text-emerald-400" : "text-ink-soft"}`}>
          {qtd}/{meta}
        </span>
      </div>

      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-brand-gradient transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {CANAIS.map((canal) => {
          const on = selecionados.includes(canal.key);
          return (
            <button
              key={canal.key}
              type="button"
              onClick={() => onToggle(canal.key)}
              title={canal.label}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                on ? "text-white shadow-sm" : "border-white/15 bg-transparent text-ink-soft hover:border-white/30"
              }`}
              style={on ? { backgroundColor: canal.cor, borderColor: canal.cor } : undefined}
            >
              <span>{canal.emoji}</span>
              <span className="hidden sm:inline">{canal.label}</span>
              {on && <span>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
