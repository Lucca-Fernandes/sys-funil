// Tipos compartilhados entre server e client components.
import type { ChecklistField } from "@/config/checklist";

export type ClienteDTO = {
  id: string;
  nome: string;
  segmento: string;
  linkCliente: string | null;
  anotacoes: string | null;
  contatosRealizados: number;
  canais: string[];
  colunaId: string | null;
  updatedAt: string;
} & Record<ChecklistField, boolean>;

// Valores do formulário de criação/edição (sem id/updatedAt).
export type ClienteFormValues = Omit<ClienteDTO, "id" | "updatedAt">;

export type ColunaDTO = {
  id: string;
  titulo: string;
  cor: string;
  ordem: number;
  /** Colunas fixas do funil: "agendamento"|"meshow"|"noshow"|"recuperados". Livres: null. */
  chave: string | null;
};

/** Categoria = quadro paralelo ao Fundo de Funil (outros tipos de leads). */
export type CategoriaDTO = {
  id: string;
  nome: string;
  ordem: number;
};
