"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { PresentationData } from "@/lib/presentation";

// Client-only: usa portal, matchMedia e scroll da janela.
const PresentationView = dynamic(() => import("@/components/presentation/PresentationView"), {
  ssr: false,
});

type Tab = "dashboard" | "apresentacao";

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "apresentacao", label: "Apresentação" },
];

/**
 * Seletor de abas da página de dashboard. "Dashboard" (existente, intacta) é a
 * aba padrão; "Apresentação" abre o palco parallax em overlay full-bleed.
 */
export default function DashboardTabs({
  presentation,
  children,
}: {
  presentation: PresentationData;
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const hasClosers = presentation.closers.length > 0;

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Modo de exibição"
        className="inline-flex rounded-2xl border border-white/10 glass p-1 card-elev"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          const disabled = t.id === "apresentacao" && !hasClosers;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              disabled={disabled}
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition ${
                active
                  ? "bg-brand-500 text-white shadow-brand"
                  : "text-ink-soft hover:bg-white/5 hover:text-ink"
              } ${disabled ? "cursor-not-allowed opacity-40 hover:bg-transparent" : ""}`}
              title={disabled ? "Sem closers para apresentar" : undefined}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {children}

      {tab === "apresentacao" && hasClosers && (
        <PresentationView data={presentation} onExit={() => setTab("dashboard")} />
      )}
    </div>
  );
}
