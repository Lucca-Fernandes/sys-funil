import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

async function carregarPropria(id: string, closerId: string) {
  const categoria = await prisma.categoria.findUnique({ where: { id } });
  if (!categoria || categoria.closerId !== closerId) {
    return { status: 404 as const, error: "Categoria não encontrada." };
  }
  return { categoria };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const res = await carregarPropria(id, session.sub);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });

  let body: { nome?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const nome = String(body.nome ?? "").trim().slice(0, 60);
  if (!nome) {
    return NextResponse.json({ error: "O nome da categoria é obrigatório." }, { status: 400 });
  }

  const categoria = await prisma.categoria.update({ where: { id }, data: { nome } });
  return NextResponse.json({ categoria });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const res = await carregarPropria(id, session.sub);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });

  // As colunas do quadro caem em cascata; os leads ficam órfãos (colunaId null)
  // e são adotados pela coluna "Sem categoria" do quadro principal na próxima carga.
  await prisma.categoria.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
