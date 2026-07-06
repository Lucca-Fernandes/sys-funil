"use client";

import { useEffect, useRef, useState } from "react";

export interface BarDatum {
  label: string;
  value: number;
}

/** Gráfico de barras verticais animado (SVG-less, CSS heights). */
export default function BarChart({
  data,
  height = 220,
  unit = "",
}: {
  data: BarDatum[];
  height?: number;
  unit?: string;
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

  return (
    <div className="scroll-fino overflow-x-auto">
    <div ref={ref} className="flex items-end justify-around gap-3" style={{ height, minWidth: data.length * 44 }}>
      {data.map((d, i) => {
        const h = shown ? (d.value / max) * (height - 38) : 0;
        return (
          <div key={d.label} className="flex h-full min-w-[2.5rem] flex-1 flex-col items-center justify-end">
            <div className="mb-1 text-sm font-bold text-ink">
              {d.value}
              {unit}
            </div>
            <div
              className="w-full max-w-[3.2rem] rounded-t-lg bg-brand-gradient shadow-brand"
              style={{
                height: h,
                transition: "height 1s cubic-bezier(0.22,1,0.36,1)",
                transitionDelay: `${i * 90}ms`,
              }}
            />
            <div className="mt-2 max-w-full truncate text-xs font-medium text-ink-soft">
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}
