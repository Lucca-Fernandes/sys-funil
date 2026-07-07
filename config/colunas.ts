export const CORES_COLUNA = [
  "#94a3b8",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#84cc16",
];

export const COR_COLUNA_PADRAO = "#f97316";

// Colunas fixas: sempre presentes, não deletáveis; a `chave` liga cada uma ao
// indicador correspondente no Dashboard.
export type ChaveColuna = "agendamento" | "meshow" | "noshow" | "recuperados";

export const COLUNAS_FIXAS: { chave: ChaveColuna; titulo: string; cor: string }[] = [
  { chave: "agendamento", titulo: "Agendamentos", cor: "#f59e0b" },
  { chave: "meshow", titulo: "Meshow", cor: "#3b82f6" },
  { chave: "noshow", titulo: "No-show", cor: "#ef4444" },
  { chave: "recuperados", titulo: "Recuperados", cor: "#10b981" },
];

export const COLUNA_LIVRE_INICIAL = { titulo: "Novos leads", cor: "#94a3b8" };

// Acolhe leads órfãos (sem coluna); é uma coluna livre comum, editável e deletável.
export const COLUNA_SEM_CATEGORIA = { titulo: "Sem categoria", cor: "#cbd5e1" };
