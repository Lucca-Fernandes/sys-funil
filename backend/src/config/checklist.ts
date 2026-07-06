// Itens do checklist que alimentam o score de "Interesse de Compra" (lib/score.ts).
// `field` PRECISA bater com o campo boolean correspondente no model Cliente (Prisma).

export type Responsavel = "SDR" | "CLOSER";

export type ChecklistGrupo = "Qualificação na call" | "Sinais de negociação";

export const GRUPOS_ORDEM: ChecklistGrupo[] = ["Qualificação na call", "Sinais de negociação"];

export type ChecklistField =
  | "confirmouSegmento"
  | "tempoMercado"
  | "responsavelNaCall"
  | "tamanhoEquipe"
  | "usaPlataforma"
  | "identificouDor"
  | "negociacaoFrequente"
  | "multiplasCalls"
  | "parouDeResponder"
  | "demonstrouDesmotivacao";

export interface ChecklistItem {
  field: ChecklistField;
  label: string;
  responsavel: Responsavel;
  grupo: ChecklistGrupo;
  /** Peso no score. Positivo = mais interesse; negativo = menos. Default +1. */
  peso: number;
  descricao?: string;
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    field: "confirmouSegmento",
    label: "Confirmou o segmento da empresa e se atua em outros segmentos?",
    responsavel: "CLOSER",
    grupo: "Qualificação na call",
    peso: 1,
  },
  {
    field: "tempoMercado",
    label: "Há quanto tempo estão no mercado de eventos?",
    responsavel: "CLOSER",
    grupo: "Qualificação na call",
    peso: 1,
  },
  {
    field: "responsavelNaCall",
    label: "É o responsável pela empresa? Convidou mais de uma pessoa para a call?",
    responsavel: "CLOSER",
    grupo: "Qualificação na call",
    peso: 1,
  },
  {
    field: "tamanhoEquipe",
    label: "Quantas pessoas possuem na equipe?",
    responsavel: "CLOSER",
    grupo: "Qualificação na call",
    peso: 1,
  },
  {
    field: "usaPlataforma",
    label: "Já utiliza alguma plataforma? Qual?",
    responsavel: "CLOSER",
    grupo: "Qualificação na call",
    peso: 1,
  },
  {
    field: "identificouDor",
    label: "Identificou alguma dor/desafio que a empresa está enfrentando?",
    responsavel: "CLOSER",
    grupo: "Qualificação na call",
    peso: 1,
  },

  {
    field: "negociacaoFrequente",
    label: "Cliente em negociação frequente?",
    responsavel: "CLOSER",
    grupo: "Sinais de negociação",
    peso: 1,
  },
  {
    field: "multiplasCalls",
    label: "Realizou mais de uma call?",
    responsavel: "CLOSER",
    grupo: "Sinais de negociação",
    peso: 1,
  },
  {
    field: "parouDeResponder",
    label: "Cliente parou de responder?",
    responsavel: "CLOSER",
    grupo: "Sinais de negociação",
    peso: 1,
  },
  {
    field: "demonstrouDesmotivacao",
    label: "Cliente demonstrou desmotivação?",
    responsavel: "CLOSER",
    grupo: "Sinais de negociação",
    peso: -1,
  },
];

export const CHECKLIST_FIELDS = CHECKLIST_ITEMS.map((i) => i.field);

export function itensPorGrupo(grupo: ChecklistGrupo): ChecklistItem[] {
  return CHECKLIST_ITEMS.filter((i) => i.grupo === grupo);
}

export const RESPONSAVEL_COR: Record<Responsavel, string> = {
  SDR: "text-red-400",
  CLOSER: "text-ink",
};
