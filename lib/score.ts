// Cálculo do "Interesse de Compra" (score) a partir do checklist.
// Cada item marcado soma seu peso; o total é normalizado para 0–100.
import { CHECKLIST_ITEMS, type ChecklistField } from "@/config/checklist";

// Soma dos pesos positivos = pontuação máxima possível.
const MAX_POSITIVO = CHECKLIST_ITEMS.reduce((s, i) => s + Math.max(0, i.peso), 0);

export type NivelInteresse = "Frio" | "Morno" | "Quente";

export interface ScoreResult {
  score: number; // 0–100
  nivel: NivelInteresse;
}

export function calcularScore(marks: Partial<Record<ChecklistField, boolean>>): number {
  let soma = 0;
  for (const item of CHECKLIST_ITEMS) {
    if (marks[item.field]) soma += item.peso;
  }
  const ratio = MAX_POSITIVO > 0 ? soma / MAX_POSITIVO : 0;
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

export function nivelInteresse(score: number): NivelInteresse {
  if (score >= 67) return "Quente";
  if (score >= 34) return "Morno";
  return "Frio";
}

export function scoreResult(marks: Partial<Record<ChecklistField, boolean>>): ScoreResult {
  const score = calcularScore(marks);
  return { score, nivel: nivelInteresse(score) };
}

// Cor/tag por nível (alinhada à barra verde→amarelo→vermelho).
export const NIVEL_COR: Record<NivelInteresse, string> = {
  Frio: "#22c55e",
  Morno: "#f59e0b",
  Quente: "#ef4444",
};

// Gradiente da barra de score (esquerda → direita), igual à referência.
export const SCORE_GRADIENT = "linear-gradient(to right, #22c55e 0%, #eab308 50%, #ef4444 100%)";
