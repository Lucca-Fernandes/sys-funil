"use client";

import { nivelInteresse, NIVEL_COR, SCORE_GRADIENT } from "@/lib/score";

export default function ScoreBar({ score }: { score: number }) {
  const s = Math.max(0, Math.min(100, score));
  const nivel = nivelInteresse(s);

  return (
    <div className="rounded-2xl border border-line bg-card-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-bold text-ink">Interesse de Compra</span>
          <span className="font-display text-sm font-extrabold text-ink">· SCORE: {s}</span>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
          style={{ backgroundColor: NIVEL_COR[nivel] }}
        >
          {nivel}
        </span>
      </div>

      <div className="relative pt-5">
        {/* moeda indicadora */}
        <div
          className="absolute top-0 -translate-x-1/2 transition-all duration-700"
          style={{ left: `${s}%` }}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-100 text-sm shadow-md">
            💰
          </div>
        </div>
        {/* trilha com gradiente */}
        <div className="h-3 w-full rounded-full" style={{ background: SCORE_GRADIENT }} />
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
        <span>Frio</span>
        <span>Morno</span>
        <span>Quente</span>
      </div>
    </div>
  );
}
