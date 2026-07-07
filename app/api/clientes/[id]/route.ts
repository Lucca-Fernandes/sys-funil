import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { buildClienteData } from "@/lib/cliente-input";
import { colunaPertence } from "@/lib/colunas";

type Ctx = { params: Promise<{ id: string }> };

// Carrega o cliente garantindo que pertence ao closer logado.
async function carregarProprio(id: string, closerId: string) {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) return { status: 404 as const, error: "Cliente não encontrado." };
  if (cliente.closerId !== closerId) {
    // Não revela existência de cliente de outro closer.
    return { status: 404 as const, error: "Cliente não encontrado." };
  }
  return { cliente };
}

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const res = await carregarProprio(id, session.sub);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });

  return NextResponse.json({ cliente: res.cliente });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const res = await carregarProprio(id, session.sub);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const built = buildClienteData(raw, true);
  if ("error" in built) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }

  if (built.data.colunaId && !(await colunaPertence(built.data.colunaId, session.sub))) {
    return NextResponse.json({ error: "Coluna inválida." }, { status: 400 });
  }

  const cliente = await prisma.cliente.update({
    where: { id },
    data: built.data,
  });

  return NextResponse.json({ cliente });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const res = await carregarProprio(id, session.sub);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });

  await prisma.cliente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
