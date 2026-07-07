import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, setSessionCookie } from "@/lib/session";
import { hashPassword, verifyPassword, validarNovaSenha } from "@/lib/password";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: { senhaAtual?: string; novaSenha?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const senhaAtual = String(body.senhaAtual ?? "");
  const novaSenha = String(body.novaSenha ?? "");

  const erroSenha = validarNovaSenha(novaSenha);
  if (erroSenha) {
    return NextResponse.json({ error: erroSenha }, { status: 400 });
  }

  const closer = await prisma.closer.findUnique({ where: { id: session.sub } });
  if (!closer) {
    return NextResponse.json({ error: "Closer não encontrado." }, { status: 404 });
  }

  const atualOk = await verifyPassword(senhaAtual, closer.senhaHash);
  if (!atualOk) {
    return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });
  }

  if (await verifyPassword(novaSenha, closer.senhaHash)) {
    return NextResponse.json(
      { error: "A nova senha deve ser diferente da atual." },
      { status: 400 },
    );
  }

  const senhaHash = await hashPassword(novaSenha);
  const atualizado = await prisma.closer.update({
    where: { id: closer.id },
    data: { senhaHash, mustChangePassword: false },
  });

  // Reemite o cookie com mustChangePassword = false.
  await setSessionCookie({
    sub: atualizado.id,
    nome: atualizado.nome,
    email: atualizado.email,
    mustChangePassword: false,
    isAdmin: atualizado.isAdmin,
  });

  return NextResponse.json({ ok: true });
}
