import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ensureColunas, whereClientesDoQuadro } from "@/lib/colunas";
import { CHECKLIST_FIELDS, type ChecklistField } from "@/config/checklist";
import type { CategoriaDTO, ClienteDTO, ColunaDTO } from "@/lib/types";
import KanbanBoard from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function FundoDeFunilPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  // Gestor não tem quadro próprio de leads.
  if (session.isAdmin) redirect("/admin");

  const { categoria } = await searchParams;

  const categoriasRaw = await prisma.categoria.findMany({
    where: { closerId: session.sub },
    orderBy: { ordem: "asc" },
  });
  const categorias: CategoriaDTO[] = categoriasRaw.map((c) => ({
    id: c.id,
    nome: c.nome,
    ordem: c.ordem,
  }));

  // Quadro atual: principal (null) ou uma categoria do closer.
  const categoriaAtual = categoria ? categorias.find((c) => c.id === categoria) ?? null : null;
  if (categoria && !categoriaAtual) redirect("/fundo-de-funil");

  // ensureColunas antes dos clientes: no quadro principal ela adota os órfãos.
  const colunasRaw = await ensureColunas(session.sub, categoriaAtual?.id ?? null);
  const clientes = await prisma.cliente.findMany({
    where: whereClientesDoQuadro(session.sub, categoriaAtual?.id ?? null),
    orderBy: { updatedAt: "desc" },
  });

  const colunas: ColunaDTO[] = colunasRaw.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    cor: c.cor,
    ordem: c.ordem,
    chave: c.chave,
  }));

  const dto: ClienteDTO[] = clientes.map((c) => {
    const checklist = Object.fromEntries(
      CHECKLIST_FIELDS.map((f) => [f, c[f]]),
    ) as Record<ChecklistField, boolean>;
    return {
      id: c.id,
      nome: c.nome,
      segmento: c.segmento,
      linkCliente: c.linkCliente,
      anotacoes: c.anotacoes,
      contatosRealizados: c.contatosRealizados,
      canais: c.canais,
      colunaId: c.colunaId,
      updatedAt: c.updatedAt.toISOString(),
      ...checklist,
    };
  });

  return (
    <KanbanBoard
      key={categoriaAtual?.id ?? "principal"}
      colunasIniciais={colunas}
      clientesIniciais={dto}
      categorias={categorias}
      categoriaAtual={categoriaAtual}
    />
  );
}
