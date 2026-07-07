import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

function avatarFallback(nome: string) {
  const iniciais =
    nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("")
      .replace(/[^A-Z0-9]/g, "") || "?"; // sanitiza: SVG servido pode executar script
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#e2e8f0"/>
  <text x="50%" y="50%" dy=".35em" text-anchor="middle"
    font-family="system-ui, sans-serif" font-size="84" fill="#64748b">${iniciais}</text>
</svg>`;
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const closer = await prisma.closer.findUnique({ where: { id } });
  if (!closer) {
    return NextResponse.json({ error: "Closer não encontrado." }, { status: 404 });
  }

  if (closer.avatarData && closer.avatarMimeType) {
    const body = new Uint8Array(closer.avatarData);
    return new NextResponse(body, {
      headers: {
        "Content-Type": closer.avatarMimeType,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  // Fallback genérico (iniciais).
  return avatarFallback(closer.nome);
}
