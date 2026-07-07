import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const TAMANHO_MAX = 4 * 1024 * 1024; // 4 MB

// Detecta o tipo pela assinatura real do arquivo (magic bytes), ignorando o
// mime declarado pelo cliente (forjável). Só bitmaps seguros — SVG é recusado
// de propósito (pode conter script).
function tipoPorAssinatura(b: Uint8Array): string | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }
  if (file.size > TAMANHO_MAX) {
    return NextResponse.json({ error: "Imagem muito grande (máx. 4 MB)." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const tipo = tipoPorAssinatura(bytes);
  if (!tipo) {
    return NextResponse.json(
      { error: "Formato não suportado. Use PNG, JPG, WEBP ou GIF." },
      { status: 400 },
    );
  }

  await prisma.closer.update({
    where: { id: session.sub },
    data: { avatarData: bytes, avatarMimeType: tipo },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  await prisma.closer.update({
    where: { id: session.sub },
    data: { avatarData: null, avatarMimeType: null },
  });
  return NextResponse.json({ ok: true });
}
