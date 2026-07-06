"use client";

import { useEffect, useRef, useState } from "react";

export interface HBarDatum {
  label: string;
  value: number;
  /** Cor da entidade (coluna/canal). Sem cor: gradiente da marca (magnitude). */
  cor?: string;
  emoji?: string;
}

/** Lista de barras horizontais finas com rótulo e valor direto por linha. */
export default function HBarList({
  data,
  unit = "",
  vazio = "Sem dados ainda",
}: {
  data: HBarDatum[];
  unit?: string;
  vazio?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      requestAnimationFrame(() => setShown(true));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (data.length === 0) {
    return <p className="py-6 text-center text-xs text-ink-soft">{vazio}</p>;
  }

  return (
    <div ref={ref} className="space-y-2.5">
      {data.map((d, i) => (
        <div key={d.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1.5 font-medium text-ink-soft">
              {d.cor && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/20"
                  style={{ backgroundColor: d.cor }}
                  aria-hidden
                />
              )}
              {d.emoji && <span aria-hidden>{d.emoji}</span>}
              <span className="truncate" title={d.label}>
                {d.label}
              </span>
            </span>
            <span className="shrink-0 font-bold text-ink">
              {d.value}
              {unit}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{
                width: shown ? `${(d.value / max) * 100}%` : 0,
                background: d.cor ?? "linear-gradient(90deg, #ff8a3d, #f95e0a)",
                transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)",
                transitionDelay: `${i * 70}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
