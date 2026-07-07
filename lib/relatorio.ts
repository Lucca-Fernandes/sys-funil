// Montagem dos dados do Relatório de Desempenho (página /admin/relatorio e PDF).
// Serializável: a mesma estrutura alimenta a tela e o arquivo exportado.
import { prisma } from "@/lib/prisma";
import {
  calcularProgressoPorCloser,
  compararMelhorResultado,
  progressoVazio,
  type ProgressoCloser,
} from "@/lib/progress";
import { calcularScore, nivelInteresse } from "@/lib/score";
import type { ChaveColuna } from "@/config/colunas";
import { CANAIS } from "@/config/channels";

export const RELATORIO_BRAND = "#f95e0a";
export const ETAPA_COR = {
  leads: "#e0430c",
  agendamento: "#f26421",
  meshow: "#f58432",
  recuperados: "#16a34a",
  noshow: "#e23b2e",
} as const;

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

export type RelatorioDados = {
  geradoEm: string;
  emitidoPor: string;
  closersAtivos: number;
  totalLeads: number;
  kpis: { label: string; valor: string; cor?: string }[];
  funil: { label: string; count: number; pctBase: number; conv: string; cor: string }[];
  niveis: { label: string; count: number; pct: number; cor: string }[];
  canais: { label: string; value: number; cor: string }[];
  segmentos: { label: string; value: number; pct: number }[];
  ranking: {
    nome: string;
    ativo: boolean;
    top: boolean;
    leads: number;
    agendamentos: number;
    meshow: number;
    noShows: number;
    recuperados: number;
    taxa: number; // 0–100
    interesse: number; // 0–100
  }[];
  quentes: { nome: string; segmento: string; closer: string; score: number }[];
  porCloser: {
    nome: string;
    leads: number;
    recuperados: number;
    taxa: number; // 0–100
    quadros: {
      nome: string;
      leads: number;
      agendamentos: number;
      meshow: number;
      noShows: number;
      recuperados: number;
      interesse: number;
    }[];
  }[];
};

export async function montarRelatorio(emitidoPor: string): Promise<RelatorioDados> {
  const [closers, categorias, clientes] = await Promise.all([
    prisma.closer.findMany({
      where: { isAdmin: false },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, ativo: true },
    }),
    prisma.categoria.findMany({ select: { id: true, nome: true, closerId: true } }),
    prisma.cliente.findMany({
      include: { coluna: { select: { chave: true, categoriaId: true } } },
    }),
  ]);

  const progressoMap = calcularProgressoPorCloser(
    clientes.map((c) => ({ ...c, etapa: (c.coluna?.chave ?? null) as ChaveColuna | null })),
  );

  const ranking = closers
    .map((c) => ({ ...c, p: progressoMap.get(c.id) ?? progressoVazio() }))
    .sort(compararMelhorResultado);

  const total = ranking.reduce(
    (a, { p }) => ({
      leads: a.leads + p.leadsCadastrados,
      agendamentos: a.agendamentos + p.agendamentos,
      meshow: a.meshow + p.meshow,
      noShows: a.noShows + p.noShows,
      recuperados: a.recuperados + p.recuperados,
      quentes: a.quentes + p.quentes,
      mornos: a.mornos + p.mornos,
      frios: a.frios + p.frios,
      somaScore: a.somaScore + p._somaScore,
    }),
    { leads: 0, agendamentos: 0, meshow: 0, noShows: 0, recuperados: 0, quentes: 0, mornos: 0, frios: 0, somaScore: 0 },
  );
  const interesseGeral = total.leads > 0 ? Math.round(total.somaScore / total.leads) : 0;

  const canais = CANAIS.map((canal) => ({
    label: canal.label,
    cor: canal.cor,
    value: clientes.filter((c) => c.canais.includes(canal.key)).length,
  })).filter((c) => c.value > 0);

  const porSegmento = new Map<string, number>();
  for (const c of clientes) porSegmento.set(c.segmento, (porSegmento.get(c.segmento) ?? 0) + 1);
  const segmentos = [...porSegmento.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value, pct: pct(value, total.leads) }));

  const nomePorCloser = new Map(closers.map((c) => [c.id, c.nome]));
  const quentes = clientes
    .map((c) => ({ c, score: calcularScore(c) }))
    .filter(
      ({ c, score }) => nivelInteresse(score) === "Quente" && c.coluna?.chave !== "recuperados",
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ c, score }) => ({
      nome: c.nome,
      segmento: c.segmento,
      closer: nomePorCloser.get(c.closerId) ?? "?",
      score,
    }));

  const catPorCloser = new Map<string, { id: string; nome: string }[]>();
  for (const cat of categorias) {
    const arr = catPorCloser.get(cat.closerId) ?? [];
    arr.push(cat);
    catPorCloser.set(cat.closerId, arr);
  }
  const statsQuadro = (closerId: string, categoriaId: string | null): ProgressoCloser => {
    const leads = clientes.filter(
      (c) => c.closerId === closerId && (c.coluna?.categoriaId ?? null) === categoriaId,
    );
    return (
      calcularProgressoPorCloser(
        leads.map((c) => ({ ...c, etapa: (c.coluna?.chave ?? null) as ChaveColuna | null })),
      ).get(closerId) ?? progressoVazio()
    );
  };

  const porCloser = ranking
    .filter((c) => c.p.leadsCadastrados > 0)
    .map((c) => ({
      nome: c.nome,
      leads: c.p.leadsCadastrados,
      recuperados: c.p.recuperados,
      taxa: Math.round(c.p.taxaRecuperacao * 100),
      quadros: [
        { id: null as string | null, nome: "Fundo de Funil" },
        ...(catPorCloser.get(c.id) ?? []),
      ].map((q) => {
        const p = statsQuadro(c.id, q.id);
        return {
          nome: q.nome,
          leads: p.leadsCadastrados,
          agendamentos: p.agendamentos,
          meshow: p.meshow,
          noShows: p.noShows,
          recuperados: p.recuperados,
          interesse: p.interesseMedio,
        };
      }),
    }));

  return {
    geradoEm: new Date().toLocaleString("pt-BR", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }),
    emitidoPor,
    closersAtivos: closers.filter((c) => c.ativo).length,
    totalLeads: total.leads,
    kpis: [
      { label: "Leads na base", valor: String(total.leads) },
      { label: "Recuperados", valor: String(total.recuperados), cor: ETAPA_COR.recuperados },
      { label: "Taxa de recuperação", valor: `${pct(total.recuperados, total.leads)}%`, cor: RELATORIO_BRAND },
      { label: "Interesse médio", valor: `${interesseGeral}%`, cor: RELATORIO_BRAND },
      { label: "Agendamentos", valor: String(total.agendamentos) },
      { label: "Meshow", valor: String(total.meshow) },
      { label: "No-shows", valor: String(total.noShows), cor: ETAPA_COR.noshow },
      { label: "Leads quentes", valor: String(total.quentes), cor: "#ef4444" },
    ],
    funil: [
      { label: "Leads cadastrados", count: total.leads, pctBase: 100, cor: ETAPA_COR.leads, conv: "base total" },
      { label: "Agendamentos", count: total.agendamentos, pctBase: pct(total.agendamentos, total.leads), cor: ETAPA_COR.agendamento, conv: `${pct(total.agendamentos, total.leads)}% da base` },
      { label: "Meshow", count: total.meshow, pctBase: pct(total.meshow, total.leads), cor: ETAPA_COR.meshow, conv: `${pct(total.meshow, total.agendamentos)}% dos agendados` },
      { label: "Recuperados", count: total.recuperados, pctBase: pct(total.recuperados, total.leads), cor: ETAPA_COR.recuperados, conv: `${pct(total.recuperados, total.leads)}% da base` },
    ],
    niveis: [
      { label: "Quentes", count: total.quentes, pct: pct(total.quentes, total.leads), cor: "#ef4444" },
      { label: "Mornos", count: total.mornos, pct: pct(total.mornos, total.leads), cor: "#f59e0b" },
      { label: "Frios", count: total.frios, pct: pct(total.frios, total.leads), cor: "#22c55e" },
    ],
    canais,
    segmentos,
    ranking: ranking.map((c, i) => ({
      nome: c.nome,
      ativo: c.ativo,
      top: i === 0 && c.p.recuperados > 0,
      leads: c.p.leadsCadastrados,
      agendamentos: c.p.agendamentos,
      meshow: c.p.meshow,
      noShows: c.p.noShows,
      recuperados: c.p.recuperados,
      taxa: Math.round(c.p.taxaRecuperacao * 100),
      interesse: c.p.interesseMedio,
    })),
    quentes,
    porCloser,
  };
}
