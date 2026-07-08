import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { SENHA_PADRAO } from "@/lib/senha-temporaria";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cria o acesso de um novo closer com a senha padrão. O closer é obrigado a
// trocá-la no primeiro acesso (mustChangePassword).
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso restrito ao gestor." }, { status: 403 });

  let body: { nome?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const nome = String(body.nome ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);

  if (!nome) return NextResponse.json({ error: "O nome é obrigatório." }, { status: 400 });
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }

  const existente = await prisma.closer.findUnique({ where: { email } });
  if (existente) {
    return NextResponse.json({ error: "Já existe um acesso com esse e-mail." }, { status: 409 });
  }

  const senhaTemporaria = SENHA_PADRAO;
  const closer = await prisma.closer.create({
    data: {
      nome,
      email,
      senhaHash: await hashPassword(senhaTemporaria),
      mustChangePassword: true,
    },
    select: { id: true, nome: true, email: true, ativo: true, isAdmin: true },
  });

  return NextResponse.json({ closer, senhaTemporaria }, { status: 201 });
}
