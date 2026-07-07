import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  let body: { email?: string; senha?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const senha = String(body.senha ?? "");

  if (!email || !senha) {
    return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });
  }

  const closer = await prisma.closer.findUnique({ where: { email } });

  // Mensagem genérica para não revelar se o e-mail existe.
  const senhaOk = closer ? await verifyPassword(senha, closer.senhaHash) : false;
  if (!closer || !senhaOk) {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }

  if (!closer.ativo) {
    return NextResponse.json(
      { error: "Acesso desativado. Fale com o gestor." },
      { status: 403 },
    );
  }

  await setSessionCookie({
    sub: closer.id,
    nome: closer.nome,
    email: closer.email,
    mustChangePassword: closer.mustChangePassword,
    isAdmin: closer.isAdmin,
  });

  return NextResponse.json({
    ok: true,
    mustChangePassword: closer.mustChangePassword,
  });
}
