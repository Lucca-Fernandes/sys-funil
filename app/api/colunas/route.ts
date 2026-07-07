import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ensureColunas, categoriaPertence } from "@/lib/colunas";
import { COR_COLUNA_PADRAO } from "@/config/colunas";

// Resolve o quadro a partir do valor do parâmetro/campo `categoria`:
// vazio/ausente = quadro principal (null); senão, id da categoria (validado).
async function resolverCategoria(
  valor: unknown,
  closerId: string,
): Promise<{ categoriaId: string | null } | { error: string }> {
  const id = typeof valor === "string" ? valor.trim() : "";
  if (!id) return { categoriaId: null };
  if (!(await categoriaPertence(id, closerId))) return { error: "Categoria inválida." };
  return { categoriaId: id };
}

// Lista as colunas do quadro (garantindo as fixas do funil).
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const cat = await resolverCategoria(new URL(req.url).searchParams.get("categoria"), session.sub);
  if ("error" in cat) return NextResponse.json({ error: cat.error }, { status: 400 });

  const colunas = await ensureColunas(session.sub, cat.categoriaId);
  return NextResponse.json({ colunas });
}

// Cria uma nova coluna LIVRE (chave null) no fim do quadro.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let body: { titulo?: string; cor?: string; categoriaId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const cat = await resolverCategoria(body.categoriaId, session.sub);
  if ("error" in cat) return NextResponse.json({ error: cat.error }, { status: 400 });

  const titulo = String(body.titulo ?? "").trim().slice(0, 60) || "Nova coluna";
  const cor = typeof body.cor === "string" ? body.cor.slice(0, 20) : COR_COLUNA_PADRAO;

  const max = await prisma.coluna.aggregate({
    where: { closerId: session.sub, categoriaId: cat.categoriaId },
    _max: { ordem: true },
  });
  const ordem = (max._max.ordem ?? -1) + 1;

  const coluna = await prisma.coluna.create({
    data: { titulo, cor, chave: null, ordem, closerId: session.sub, categoriaId: cat.categoriaId },
  });

  return NextResponse.json({ coluna }, { status: 201 });
}
