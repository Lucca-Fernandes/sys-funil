"use client";

import { CONTATOS_MAX_INPUT, CONTATOS_MIN } from "@/config/channels";

// "Quantidade mínima de contatos" — barra de progresso + círculos numerados clicáveis.
export default function ContatosWidget({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const meta = CONTATOS_MIN;
  const pct = Math.min(100, (value / meta) * 100);
  const atingiu = value >= meta;

  return (
    <div className="rounded-2xl border border-line bg-card-2 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span
            className={`inline-block h-3 w-3 rounded-full border-2 ${
              atingiu ? "border-emerald-500 bg-emerald-500" : "border-white/25"
            }`}
          />
          Quantidade mínima de contatos
        </span>
        <span className={`text-sm font-bold ${atingiu ? "text-emerald-400" : "text-ink-soft"}`}>
          {value}/{meta}
        </span>
      </div>

      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-brand-gradient transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: CONTATOS_MAX_INPUT }, (_, i) => i + 1).map((n) => {
          const on = value >= n;
          return (
            <button
              key={n}
              type="button"
              // Clicar de novo no número atual zera aquele passo.
              onClick={() => onChange(value === n ? n - 1 : n)}
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition ${
                on
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-white/15 text-ink-soft hover:border-brand-400 hover:text-brand-400"
              }`}
              aria-label={`${n} contatos`}
            >
              {on ? "✓" : n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
