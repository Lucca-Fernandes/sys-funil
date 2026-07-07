import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { calcularScore, nivelInteresse } from "@/lib/score";
import { gerarCsv, respostaCsv } from "@/lib/csv";

// Exporta todos os leads da operação (uma linha por lead).
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso restrito ao gestor." }, { status: 403 });

  const [clientes, categorias] = await Promise.all([
    prisma.cliente.findMany({
      include: {
        closer: { select: { nome: true } },
        coluna: { select: { titulo: true, chave: true, categoriaId: true } },
      },
      orderBy: [{ closerId: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.categoria.findMany({ select: { id: true, nome: true } }),
  ]);
  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));

  const dataBr = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const linhas = clientes.map((c) => {
    const score = calcularScore(c);
    return [
      c.closer.nome,
      c.coluna?.categoriaId ? nomeCategoria.get(c.coluna.categoriaId) ?? "?" : "Fundo de Funil",
      c.coluna?.titulo ?? "Sem coluna",
      c.coluna?.chave ?? "",
      c.nome,
      c.segmento,
      score,
      nivelInteresse(score),
      c.contatosRealizados,
      c.canais.join(" | "),
      c.linkCliente ?? "",
      dataBr(c.createdAt),
      dataBr(c.updatedAt),
    ];
  });

  const csv = gerarCsv(
    [
      "Closer",
      "Quadro",
      "Coluna",
      "Etapa fixa",
      "Lead",
      "Segmento",
      "Interesse (0-100)",
      "Nível",
      "Contatos",
      "Canais",
      "Link",
      "Criado em",
      "Atualizado em",
    ],
    linhas,
  );

  const hoje = new Date().toISOString().slice(0, 10);
  return respostaCsv(csv, `meeventos-leads-${hoje}.csv`);
}
