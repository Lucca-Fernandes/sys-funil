import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Lista as categorias (quadros paralelos) do closer.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const categorias = await prisma.categoria.findMany({
    where: { closerId: session.sub },
    orderBy: { ordem: "asc" },
  });
  return NextResponse.json({ categorias });
}

// Cria uma nova categoria (quadro). As colunas do quadro são criadas na 1ª visita.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

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

  const max = await prisma.categoria.aggregate({
    where: { closerId: session.sub },
    _max: { ordem: true },
  });
  const ordem = (max._max.ordem ?? -1) + 1;

  const categoria = await prisma.categoria.create({
    data: { nome, ordem, closerId: session.sub },
  });

  return NextResponse.json({ categoria }, { status: 201 });
}
