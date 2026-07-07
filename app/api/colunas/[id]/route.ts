import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { COLUNA_SEM_CATEGORIA } from "@/config/colunas";

type Ctx = { params: Promise<{ id: string }> };

async function carregarPropria(id: string, closerId: string) {
  const coluna = await prisma.coluna.findUnique({ where: { id } });
  if (!coluna || coluna.closerId !== closerId) {
    return { status: 404 as const, error: "Coluna não encontrada." };
  }
  return { coluna };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const res = await carregarPropria(id, session.sub);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const ehFixa = res.coluna.chave != null;

  const data: { titulo?: string; cor?: string; ordem?: number } = {};
  // Colunas fixas não podem ser renomeadas (o título identifica a etapa do funil).
  if (!ehFixa && typeof body.titulo === "string") {
    data.titulo = body.titulo.trim().slice(0, 60) || "Coluna";
  }
  if (typeof body.cor === "string") data.cor = body.cor.slice(0, 20);
  if (typeof body.ordem === "number" && Number.isFinite(body.ordem)) {
    data.ordem = Math.max(0, Math.floor(body.ordem));
  }

  const coluna = await prisma.coluna.update({ where: { id }, data });
  return NextResponse.json({ coluna });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const res = await carregarPropria(id, session.sub);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });

  // Colunas fixas do funil não podem ser excluídas.
  if (res.coluna.chave != null) {
    return NextResponse.json(
      { error: "Coluna fixa do funil não pode ser excluída." },
      { status: 400 },
    );
  }

  // Se a coluna tem leads, eles são realocados antes de excluir (nunca somem):
  // vão para a coluna "Sem categoria" do mesmo quadro (criada se preciso).
  // Se a própria coluna excluída é a "Sem categoria", vão para a primeira
  // coluna livre restante — ou, na falta dela, para a primeira coluna do quadro.
  const temLeads = (await prisma.cliente.count({ where: { colunaId: id } })) > 0;
  if (temLeads) {
    const destinoId = await colunaDestino(res.coluna);
    if (destinoId) {
      await prisma.cliente.updateMany({ where: { colunaId: id }, data: { colunaId: destinoId } });
    }
  }

  await prisma.coluna.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

async function colunaDestino(excluida: {
  id: string;
  titulo: string;
  closerId: string;
  categoriaId: string | null;
}): Promise<string | null> {
  const irmas = await prisma.coluna.findMany({
    where: { closerId: excluida.closerId, categoriaId: excluida.categoriaId, id: { not: excluida.id } },
    orderBy: { ordem: "asc" },
  });

  if (excluida.titulo !== COLUNA_SEM_CATEGORIA.titulo) {
    const semCategoria = irmas.find((c) => !c.chave && c.titulo === COLUNA_SEM_CATEGORIA.titulo);
    if (semCategoria) return semCategoria.id;
    // Cria "Sem categoria" no início do quadro (desloca as demais).
    const [, criada] = await prisma.$transaction([
      prisma.coluna.updateMany({
        where: { closerId: excluida.closerId, categoriaId: excluida.categoriaId },
        data: { ordem: { increment: 1 } },
      }),
      prisma.coluna.create({
        data: {
          ...COLUNA_SEM_CATEGORIA,
          chave: null,
          ordem: 0,
          closerId: excluida.closerId,
          categoriaId: excluida.categoriaId,
        },
      }),
    ]);
    return criada.id;
  }

  const livre = irmas.find((c) => !c.chave);
  return (livre ?? irmas[0])?.id ?? null;
}
