import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import {
  calcularProgressoPorCloser,
  compararMelhorResultado,
  progressoVazio,
} from "@/lib/progress";
import type { ChaveColuna } from "@/config/colunas";
import { gerarCsv, respostaCsv } from "@/lib/csv";

// Exporta o desempenho consolidado por closer (uma linha por closer).
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso restrito ao gestor." }, { status: 403 });

  const [closers, clientes] = await Promise.all([
    prisma.closer.findMany({
      where: { isAdmin: false },
      select: { id: true, nome: true, email: true, ativo: true },
      orderBy: { nome: "asc" },
    }),
    prisma.cliente.findMany({
      select: {
        closerId: true,
        confirmouSegmento: true,
        tempoMercado: true,
        responsavelNaCall: true,
        tamanhoEquipe: true,
        usaPlataforma: true,
        identificouDor: true,
        negociacaoFrequente: true,
        multiplasCalls: true,
        parouDeResponder: true,
        demonstrouDesmotivacao: true,
        coluna: { select: { chave: true } },
      },
    }),
  ]);

  const progressoMap = calcularProgressoPorCloser(
    clientes.map(({ coluna, ...c }) => ({
      ...c,
      etapa: (coluna?.chave ?? null) as ChaveColuna | null,
    })),
  );

  const linhas = closers
    .map((c) => ({ ...c, p: progressoMap.get(c.id) ?? progressoVazio() }))
    .sort(compararMelhorResultado)
    .map((c, i) => [
      i + 1,
      c.nome,
      c.email,
      c.ativo ? "Ativo" : "Desativado",
      c.p.leadsCadastrados,
      c.p.agendamentos,
      c.p.meshow,
      c.p.noShows,
      c.p.recuperados,
      `${Math.round(c.p.taxaRecuperacao * 100)}%`,
      `${c.p.interesseMedio}%`,
      c.p.quentes,
      c.p.mornos,
      c.p.frios,
    ]);

  const csv = gerarCsv(
    [
      "Posição",
      "Closer",
      "E-mail",
      "Status",
      "Leads",
      "Agendamentos",
      "Meshow",
      "No-shows",
      "Recuperados",
      "Taxa de recuperação",
      "Interesse médio",
      "Quentes",
      "Mornos",
      "Frios",
    ],
    linhas,
  );

  const hoje = new Date().toISOString().slice(0, 10);
  return respostaCsv(csv, `meeventos-desempenho-${hoje}.csv`);
}
