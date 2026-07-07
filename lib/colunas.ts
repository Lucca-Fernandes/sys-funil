import { prisma } from "@/lib/prisma";
import { COLUNAS_FIXAS, COLUNA_LIVRE_INICIAL, COLUNA_SEM_CATEGORIA } from "@/config/colunas";

/**
 * Garante que o quadro (principal ou de uma categoria) tenha as colunas FIXAS
 * do funil (Agendamentos, Meshow, No-show, Recuperados). Cria as que faltarem.
 * Na 1ª vez também cria a coluna livre "Novos leads" antes das fixas.
 * No quadro principal, adota leads órfãos (sem coluna) na coluna "Sem categoria",
 * criando-a se necessário. Idempotente.
 */
export async function ensureColunas(closerId: string, categoriaId: string | null = null) {
  const existentes = await mesclarColunasFixasDuplicadas(closerId, categoriaId);
  const primeiraVez = existentes.length === 0;
  const chavesExistentes = new Set(existentes.map((c) => c.chave).filter(Boolean));

  const maxOrdem = existentes.reduce((m, c) => Math.max(m, c.ordem), -1);
  let ordem = maxOrdem + 1;
  const aCriar: {
    titulo: string;
    cor: string;
    chave: string | null;
    ordem: number;
    closerId: string;
    categoriaId: string | null;
  }[] = [];

  if (primeiraVez) {
    aCriar.push({ ...COLUNA_LIVRE_INICIAL, chave: null, ordem: ordem++, closerId, categoriaId });
  }
  for (const fixa of COLUNAS_FIXAS) {
    if (!chavesExistentes.has(fixa.chave)) {
      aCriar.push({ titulo: fixa.titulo, cor: fixa.cor, chave: fixa.chave, ordem: ordem++, closerId, categoriaId });
    }
  }

  if (aCriar.length > 0) {
    await prisma.coluna.createMany({ data: aCriar });
  }

  // Quadro principal: leads órfãos (colunaId null) entram em "Sem categoria".
  if (categoriaId === null) {
    await adotarLeadsSemColuna(closerId);
  }

  return prisma.coluna.findMany({
    where: { closerId, categoriaId },
    orderBy: { ordem: "asc" },
  });
}

/**
 * Move leads órfãos (sem coluna) para a coluna livre "Sem categoria" do quadro
 * principal, criando-a no início do quadro se não existir. Só cria a coluna
 * quando há órfãos — se o closer a excluir, ela não volta sozinha.
 */
async function adotarLeadsSemColuna(closerId: string) {
  const orfaos = await prisma.cliente.count({ where: { closerId, colunaId: null } });
  if (orfaos === 0) return;

  let destino = await prisma.coluna.findFirst({
    where: { closerId, categoriaId: null, chave: null, titulo: COLUNA_SEM_CATEGORIA.titulo },
    orderBy: { ordem: "asc" },
  });

  if (!destino) {
    const [, criada] = await prisma.$transaction([
      prisma.coluna.updateMany({
        where: { closerId, categoriaId: null },
        data: { ordem: { increment: 1 } },
      }),
      prisma.coluna.create({
        data: { ...COLUNA_SEM_CATEGORIA, chave: null, ordem: 0, closerId, categoriaId: null },
      }),
    ]);
    destino = criada;
  }

  await prisma.cliente.updateMany({
    where: { closerId, colunaId: null },
    data: { colunaId: destino.id },
  });
}

/**
 * Self-healing: se houver colunas FIXAS duplicadas (mesma `chave`) no mesmo
 * quadro, mantém a de menor `ordem`, reatribui os leads das duplicatas para ela
 * e apaga as demais. Nunca orfana leads (reatribui antes de deletar).
 * Retorna as colunas restantes do quadro.
 */
async function mesclarColunasFixasDuplicadas(closerId: string, categoriaId: string | null) {
  const existentes = await prisma.coluna.findMany({
    where: { closerId, categoriaId },
    orderBy: { ordem: "asc" },
  });

  const porChave = new Map<string, typeof existentes>();
  for (const c of existentes) {
    if (!c.chave) continue;
    const arr = porChave.get(c.chave) ?? [];
    arr.push(c);
    porChave.set(c.chave, arr);
  }

  const removidos = new Set<string>();
  for (const cols of porChave.values()) {
    if (cols.length <= 1) continue;
    const [manter, ...duplicatas] = cols; // menor ordem primeiro
    const dupIds = duplicatas.map((d) => d.id);
    await prisma.$transaction([
      prisma.cliente.updateMany({
        where: { colunaId: { in: dupIds } },
        data: { colunaId: manter.id },
      }),
      prisma.coluna.deleteMany({ where: { id: { in: dupIds } } }),
    ]);
    dupIds.forEach((id) => removidos.add(id));
  }

  return removidos.size === 0 ? existentes : existentes.filter((c) => !removidos.has(c.id));
}

/** Confere se a coluna existe e pertence ao closer. */
export async function colunaPertence(colunaId: string, closerId: string): Promise<boolean> {
  const c = await prisma.coluna.findUnique({
    where: { id: colunaId },
    select: { closerId: true },
  });
  return !!c && c.closerId === closerId;
}

/**
 * Filtro (where) dos clientes de um quadro: leads cuja coluna pertence ao
 * quadro. No quadro principal (null) inclui também os órfãos ainda não adotados.
 */
export function whereClientesDoQuadro(closerId: string, categoriaId: string | null) {
  return categoriaId === null
    ? { closerId, OR: [{ coluna: { categoriaId: null } }, { colunaId: null }] }
    : { closerId, coluna: { categoriaId } };
}

/** Confere se a categoria existe e pertence ao closer. */
export async function categoriaPertence(categoriaId: string, closerId: string): Promise<boolean> {
  const c = await prisma.categoria.findUnique({
    where: { id: categoriaId },
    select: { closerId: true },
  });
  return !!c && c.closerId === closerId;
}
