import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAdminSession } from "@/lib/session";
import { montarRelatorio } from "@/lib/relatorio";
import { criarRelatorioPdf } from "@/components/admin/RelatorioPdf";

// Gera e baixa o Relatório de Desempenho em PDF.
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Acesso restrito ao gestor." }, { status: 403 });

  const dados = await montarRelatorio(session.nome);
  const buffer = await renderToBuffer(criarRelatorioPdf(dados));

  const hoje = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="meeventos-relatorio-${hoje}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
