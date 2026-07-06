// Sanitização/validação de entrada para o model Cliente.
import { isSegmentoValido, SEGMENTO_PADRAO } from "@/config/segmentos";
import { CHECKLIST_FIELDS, type ChecklistField } from "@/config/checklist";
import { CANAL_KEYS } from "@/config/channels";

export type ClienteData = {
  nome: string;
  segmento: string;
  linkCliente: string | null;
  anotacoes: string | null;
  contatosRealizados: number;
  canais: string[];
  colunaId: string | null;
} & Record<ChecklistField, boolean>;

function toIntNaoNegativo(v: unknown, max = 1_000_000): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}

function toStrOuNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s.slice(0, 5000) : null;
}

function toCanais(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const validos = v.filter((k): k is string => typeof k === "string" && CANAL_KEYS.includes(k));
  return Array.from(new Set(validos));
}

/**
 * Constrói os dados de um Cliente a partir de um payload bruto.
 * - `partial = false`: valida `nome` e devolve o objeto completo (create).
 * - `partial = true`: devolve apenas os campos presentes no payload (update).
 *
 * Obs.: a propriedade do `colunaId` (se pertence ao closer) é validada na rota.
 */
export function buildClienteData(
  raw: Record<string, unknown>,
  partial: boolean,
): { data: Partial<ClienteData> } | { error: string } {
  const data: Partial<ClienteData> = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(raw, k);

  if (!partial || has("nome")) {
    const nome = String(raw.nome ?? "").trim();
    if (!nome) return { error: "O nome é obrigatório." };
    data.nome = nome.slice(0, 200);
  }

  if (!partial || has("segmento")) {
    data.segmento = isSegmentoValido(raw.segmento) ? raw.segmento : SEGMENTO_PADRAO;
  }

  if (!partial || has("contatosRealizados"))
    data.contatosRealizados = toIntNaoNegativo(raw.contatosRealizados, 9999);
  if (!partial || has("canais")) data.canais = toCanais(raw.canais);

  if (!partial || has("linkCliente")) data.linkCliente = toStrOuNull(raw.linkCliente);
  if (!partial || has("anotacoes")) data.anotacoes = toStrOuNull(raw.anotacoes);

  if (has("colunaId")) {
    const v = raw.colunaId;
    data.colunaId = v === null || v === undefined || v === "" ? null : String(v);
  }

  for (const field of CHECKLIST_FIELDS) {
    if (!partial || has(field)) {
      data[field] = Boolean(raw[field]);
    }
  }

  return { data };
}
