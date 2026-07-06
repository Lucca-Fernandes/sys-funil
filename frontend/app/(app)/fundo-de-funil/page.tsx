import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { apiServerJson } from "@/lib/api-server";
import type { CategoriaDTO, ClienteDTO, ColunaDTO } from "@/lib/types";
import KanbanBoard from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

type FundoResp = {
  categorias: CategoriaDTO[];
  categoriaAtual: CategoriaDTO | null;
  colunas: ColunaDTO[];
  clientes: ClienteDTO[];
};

export default async function FundoDeFunilPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  // Gestor não tem quadro próprio de leads.
  if (session.isAdmin) redirect("/admin");

  const { categoria } = await searchParams;
  const qs = categoria ? `?categoria=${encodeURIComponent(categoria)}` : "";
  const { ok, status, data } = await apiServerJson<FundoResp>(`/api/views/fundo-de-funil${qs}`);
  // Categoria inexistente/de outro closer → volta ao quadro principal.
  if (status === 404) redirect("/fundo-de-funil");
  if (!ok || !data) redirect("/login");

  const { categorias, categoriaAtual, colunas, clientes } = data;

  return (
    <KanbanBoard
      key={categoriaAtual?.id ?? "principal"}
      colunasIniciais={colunas}
      clientesIniciais={clientes}
      categorias={categorias}
      categoriaAtual={categoriaAtual}
    />
  );
}
