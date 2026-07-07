// Cálculo dos indicadores de progresso por closer (Dashboard).
import { calcularScore, nivelInteresse } from "@/lib/score";
import type { ChecklistField } from "@/config/checklist";
import type { ChaveColuna } from "@/config/colunas";

export type ClienteProgressoInput = {
  closerId: string;
  /** Etapa do funil = `chave` da coluna onde o lead está (ou null se coluna livre). */
  etapa: ChaveColuna | null;
} & Partial<Record<ChecklistField, boolean>>;

export interface ProgressoCloser {
  leadsCadastrados: number;
  agendamentos: number;
  meshow: number;
  noShows: number;
  recuperados: number;
  /** Média do score de interesse de compra (0–100). */
  interesseMedio: number;
  quentes: number;
  mornos: number;
  frios: number;
  /** Recuperados ÷ Leads cadastrados (0–1). Indicador de progresso, não meta. */
  taxaRecuperacao: number;
  _somaScore: number; // interno para média
}

export function progressoVazio(): ProgressoCloser {
  return {
    leadsCadastrados: 0,
    agendamentos: 0,
    meshow: 0,
    noShows: 0,
    recuperados: 0,
    interesseMedio: 0,
    quentes: 0,
    mornos: 0,
    frios: 0,
    taxaRecuperacao: 0,
    _somaScore: 0,
  };
}

/**
 * Ordena do melhor para o pior resultado (Dashboard e Apresentação usam a
 * mesma régua): recuperados, depois taxa de recuperação, interesse médio e,
 * por fim, nome (desempate estável).
 */
export function compararMelhorResultado(
  a: { nome: string; p: ProgressoCloser },
  b: { nome: string; p: ProgressoCloser },
): number {
  return (
    b.p.recuperados - a.p.recuperados ||
    b.p.taxaRecuperacao - a.p.taxaRecuperacao ||
    b.p.interesseMedio - a.p.interesseMedio ||
    a.nome.localeCompare(b.nome, "pt-BR")
  );
}

/** Agrupa os clientes por closerId e calcula os indicadores. */
export function calcularProgressoPorCloser(
  clientes: ClienteProgressoInput[],
): Map<string, ProgressoCloser> {
  const mapa = new Map<string, ProgressoCloser>();

  for (const c of clientes) {
    const p = mapa.get(c.closerId) ?? progressoVazio();
    p.leadsCadastrados += 1;
    if (c.etapa === "agendamento") p.agendamentos += 1;
    else if (c.etapa === "meshow") p.meshow += 1;
    else if (c.etapa === "noshow") p.noShows += 1;
    else if (c.etapa === "recuperados") p.recuperados += 1;

    const score = calcularScore(c);
    p._somaScore += score;
    const nivel = nivelInteresse(score);
    if (nivel === "Quente") p.quentes += 1;
    else if (nivel === "Morno") p.mornos += 1;
    else p.frios += 1;

    mapa.set(c.closerId, p);
  }

  for (const p of mapa.values()) {
    p.taxaRecuperacao = p.leadsCadastrados > 0 ? p.recuperados / p.leadsCadastrados : 0;
    p.interesseMedio = p.leadsCadastrados > 0 ? Math.round(p._somaScore / p.leadsCadastrados) : 0;
  }

  return mapa;
}
