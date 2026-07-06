// Forma dos dados do Relatório de Desempenho (o cálculo roda no backend, em
// /api/views/relatorio). Aqui ficam apenas o tipo e as cores para renderizar.
export const RELATORIO_BRAND = "#f95e0a";
export const ETAPA_COR = {
  leads: "#e0430c",
  agendamento: "#f26421",
  meshow: "#f58432",
  recuperados: "#16a34a",
  noshow: "#e23b2e",
} as const;

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
    taxa: number;
    interesse: number;
  }[];
  quentes: { nome: string; segmento: string; closer: string; score: number }[];
  porCloser: {
    nome: string;
    leads: number;
    recuperados: number;
    taxa: number;
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
