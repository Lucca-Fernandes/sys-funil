// Modelo serializável da aba "Apresentação": transforma os indicadores de
// lib/progress.ts no formato que as cenas do palco consomem.
import type { ProgressoCloser } from "@/lib/progress";
import { compararMelhorResultado, progressoVazio } from "@/lib/progress";

const COR = {
  brand: "#F26421",
  light: "#F58432",
  deep: "#E0430C",
  ink: "#211A15",
  red: "#E23B2E",
  green: "#16A34A",
} as const;

export type PresStat = { n: number; label: string; suf: string; color: string };
export type PresFunnelBar = { label: string; pct: number; val: number; color: string };

export type PresCloser = {
  id: string;
  name: string; // primeiro nome (hero/labels)
  fullName: string;
  initial: string;
  role: string;
  photoUrl: string;
  heroLine: string;
  recupPct: number; // 0–100 (anel RECUP.)
  stats: PresStat[]; // 6 na ordem LEADS…INTERESSE MÉD.
  funnel: PresFunnelBar[]; // 4 (Leads→Recuperados)
  metrics: Record<PresMetricKey, number>; // valores para o comparativo
};

export type PresMetricKey = "recuperados" | "interesse" | "meshow" | "taxa";
export type PresMetricDef = { label: string; color: string; suf: string };

export type PresKpi = { label: string; value: number; suf: string; color: string };
export type PresFunnelStep = {
  label: string;
  count: number;
  pct: number; // % do total de leads
  conv: string; // conversão da etapa anterior (texto)
  color: string;
};

export type PresentationData = {
  closers: PresCloser[];
  kpis: PresKpi[]; // 4
  funnelC: PresFunnelStep[]; // 4
  taxaGeral: number; // 0–100
  metrics: Record<PresMetricKey, PresMetricDef>;
};

export const PRES_METRICS: Record<PresMetricKey, PresMetricDef> = {
  recuperados: { label: "Recuperados", color: COR.green, suf: "" },
  interesse: { label: "Interesse", color: COR.brand, suf: "%" },
  meshow: { label: "MeShow", color: COR.light, suf: "" },
  taxa: { label: "Taxa recup.", color: COR.deep, suf: "%" },
};

const primeiroNome = (n: string) => n.trim().split(/\s+/)[0] ?? n;
const inicial = (n: string) => (n.trim()[0] ?? "?").toUpperCase();
const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

type CloserRef = { id: string; nome: string };

/**
 * Constrói o modelo de apresentação a partir dos closers e do progresso já
 * calculado. Ordena do melhor para o pior resultado (mesma régua do Dashboard,
 * lib/progress.ts) e marca o líder como "TOP PERFORMER" (como no protótipo).
 */
export function buildPresentationData(
  closers: CloserRef[],
  progressoMap: Map<string, ProgressoCloser>,
): PresentationData {
  const linhas = closers
    .map((c) => ({ closer: c, p: progressoMap.get(c.id) ?? progressoVazio() }))
    .sort((a, b) =>
      compararMelhorResultado({ nome: a.closer.nome, p: a.p }, { nome: b.closer.nome, p: b.p }),
    );

  const temTop = linhas.length > 0 && linhas[0].p.recuperados > 0;

  const presClosers: PresCloser[] = linhas.map(({ closer, p }, i) => {
    const recupPct = Math.round(p.taxaRecuperacao * 100);
    const stats: PresStat[] = [
      { n: p.leadsCadastrados, label: "LEADS", suf: "", color: COR.brand },
      { n: p.agendamentos, label: "AGENDAMENTOS", suf: "", color: COR.ink },
      { n: p.meshow, label: "MESHOW", suf: "", color: COR.brand },
      { n: p.noShows, label: "NO-SHOWS", suf: "", color: COR.red },
      { n: p.recuperados, label: "RECUPERADOS", suf: "", color: COR.green },
      { n: p.interesseMedio, label: "INTERESSE MÉD.", suf: "%", color: COR.brand },
    ];
    const L = p.leadsCadastrados;
    const funnel: PresFunnelBar[] = [
      { label: "Leads", pct: 100, val: L, color: COR.deep },
      { label: "Agendamentos", pct: pct(p.agendamentos, L), val: p.agendamentos, color: COR.brand },
      { label: "MeShow", pct: pct(p.meshow, L), val: p.meshow, color: COR.light },
      { label: "Recuperados", pct: pct(p.recuperados, L), val: p.recuperados, color: COR.green },
    ];
    return {
      id: closer.id,
      name: primeiroNome(closer.nome),
      fullName: closer.nome,
      initial: inicial(closer.nome),
      role: temTop && i === 0 ? "CLOSER · TOP PERFORMER" : "CLOSER",
      photoUrl: `/api/closers/${closer.id}/avatar`,
      heroLine: `${p.leadsCadastrados} leads · ${p.recuperados} recuperados · ${p.interesseMedio}% de interesse médio`,
      recupPct,
      stats,
      funnel,
      metrics: {
        recuperados: p.recuperados,
        interesse: p.interesseMedio,
        meshow: p.meshow,
        taxa: recupPct,
      },
    };
  });

  // Consolidados (somas/derivados de todos os closers).
  const sum = (sel: (p: ProgressoCloser) => number) =>
    linhas.reduce((acc, { p }) => acc + sel(p), 0);
  const tLeads = sum((p) => p.leadsCadastrados);
  const tAg = sum((p) => p.agendamentos);
  const tMs = sum((p) => p.meshow);
  const tRec = sum((p) => p.recuperados);
  const tQuentes = sum((p) => p.quentes);
  const interesseMedio =
    linhas.length > 0
      ? Math.round(linhas.reduce((a, { p }) => a + p.interesseMedio, 0) / linhas.length)
      : 0;

  const kpis: PresKpi[] = [
    { label: "LEADS TOTAIS", value: tLeads, suf: "", color: COR.brand },
    { label: "RECUPERADOS", value: tRec, suf: "", color: COR.green },
    { label: "INTERESSE MÉDIO", value: interesseMedio, suf: "%", color: COR.ink },
    { label: "LEADS QUENTES", value: tQuentes, suf: "", color: COR.red },
  ];

  const funnelC: PresFunnelStep[] = [
    { label: "Leads", count: tLeads, pct: 100, conv: "etapa inicial", color: COR.deep },
    {
      label: "Agendamentos",
      count: tAg,
      pct: pct(tAg, tLeads),
      conv: `${pct(tAg, tLeads)}%`,
      color: COR.brand,
    },
    { label: "MeShow", count: tMs, pct: pct(tMs, tLeads), conv: `${pct(tMs, tAg)}%`, color: COR.light },
    {
      label: "Recuperados",
      count: tRec,
      pct: pct(tRec, tLeads),
      conv: `${pct(tRec, tMs)}%`,
      color: COR.green,
    },
  ];

  return {
    closers: presClosers,
    kpis,
    funnelC,
    taxaGeral: pct(tRec, tLeads),
    metrics: PRES_METRICS,
  };
}
