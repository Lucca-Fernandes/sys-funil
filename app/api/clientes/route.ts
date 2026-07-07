import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { buildClienteData } from "@/lib/cliente-input";
import { colunaPertence, categoriaPertence, whereClientesDoQuadro } from "@/lib/colunas";

// `?categoria=` filtra por quadro (vazio = principal); sem o parâmetro, lista todos.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  let where: Record<string, unknown> = { closerId: session.sub };
  if (params.has("categoria")) {
    const id = (params.get("categoria") ?? "").trim();
    if (id && !(await categoriaPertence(id, session.sub))) {
      return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
    }
    where = whereClientesDoQuadro(session.sub, id || null);
  }

  const clientes = await prisma.cliente.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ clientes });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const result = buildClienteData(raw, false);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (result.data.colunaId && !(await colunaPertence(result.data.colunaId, session.sub))) {
    return NextResponse.json({ error: "Coluna inválida." }, { status: 400 });
  }

  const cliente = await prisma.cliente.create({
    data: {
      ...(result.data as Required<typeof result.data>),
      closerId: session.sub,
    },
  });

  return NextResponse.json({ cliente }, { status: 201 });
}
