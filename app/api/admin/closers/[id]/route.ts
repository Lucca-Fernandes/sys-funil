import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { SENHA_PADRAO } from "@/lib/senha-temporaria";

type Ctx = { params: Promise<{ id: string }> };

// Ações do gestor sobre um closer: ativar/desativar, renomear, resetar senha.
export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso restrito ao gestor." }, { status: 403 });

  const { id } = await params;
  const closer = await prisma.closer.findUnique({ where: { id } });
  if (!closer) return NextResponse.json({ error: "Closer não encontrado." }, { status: 404 });

  let body: { ativo?: boolean; nome?: string; resetarSenha?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const data: { ativo?: boolean; nome?: string; senhaHash?: string; mustChangePassword?: boolean } = {};
  let senhaTemporaria: string | undefined;

  if (typeof body.ativo === "boolean") {
    if (id === session.sub) {
      return NextResponse.json(
        { error: "Você não pode desativar o próprio acesso." },
        { status: 400 },
      );
    }
    data.ativo = body.ativo;
  }

  if (typeof body.nome === "string") {
    const nome = body.nome.trim().slice(0, 120);
    if (!nome) return NextResponse.json({ error: "O nome é obrigatório." }, { status: 400 });
    data.nome = nome;
  }

  if (body.resetarSenha === true) {
    senhaTemporaria = SENHA_PADRAO;
    data.senhaHash = await hashPassword(senhaTemporaria);
    data.mustChangePassword = true;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  const atualizado = await prisma.closer.update({
    where: { id },
    data,
    select: { id: true, nome: true, email: true, ativo: true, isAdmin: true },
  });

  return NextResponse.json({ closer: atualizado, ...(senhaTemporaria ? { senhaTemporaria } : {}) });
}
