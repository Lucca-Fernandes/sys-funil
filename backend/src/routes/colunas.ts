import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { ensureColunas, categoriaPertence } from "@/lib/colunas";
import { COR_COLUNA_PADRAO, COLUNA_SEM_CATEGORIA } from "@/config/colunas";
import { requireAuth, denyIfMustChange } from "@/middleware/auth";
import { asyncHandler, closerId, param } from "@/lib/http";

const router = Router();
router.use(requireAuth, denyIfMustChange);

// vazio/ausente = quadro principal (null); senão, id da categoria (validado).
async function resolverCategoria(
  valor: unknown,
  cid: string,
): Promise<{ categoriaId: string | null } | { error: string }> {
  const id = typeof valor === "string" ? valor.trim() : "";
  if (!id) return { categoriaId: null };
  if (!(await categoriaPertence(id, cid))) return { error: "Categoria inválida." };
  return { categoriaId: id };
}

// Lista as colunas do quadro (garantindo as fixas do funil).
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const cid = closerId(req);
    const cat = await resolverCategoria(req.query.categoria, cid);
    if ("error" in cat) return res.status(400).json({ error: cat.error });
    const colunas = await ensureColunas(cid, cat.categoriaId);
    res.json({ colunas });
  }),
);

// Cria uma nova coluna LIVRE (chave null) no fim do quadro.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const cid = closerId(req);
    const body = (req.body ?? {}) as { titulo?: string; cor?: string; categoriaId?: string };

    const cat = await resolverCategoria(body.categoriaId, cid);
    if ("error" in cat) return res.status(400).json({ error: cat.error });

    const titulo = String(body.titulo ?? "").trim().slice(0, 60) || "Nova coluna";
    const cor = typeof body.cor === "string" ? body.cor.slice(0, 20) : COR_COLUNA_PADRAO;

    const max = await prisma.coluna.aggregate({
      where: { closerId: cid, categoriaId: cat.categoriaId },
      _max: { ordem: true },
    });
    const ordem = (max._max.ordem ?? -1) + 1;

    const coluna = await prisma.coluna.create({
      data: { titulo, cor, chave: null, ordem, closerId: cid, categoriaId: cat.categoriaId },
    });
    res.status(201).json({ coluna });
  }),
);

async function carregarPropria(id: string, cid: string) {
  const coluna = await prisma.coluna.findUnique({ where: { id } });
  if (!coluna || coluna.closerId !== cid) {
    return { ok: false as const, status: 404, error: "Coluna não encontrada." };
  }
  return { ok: true as const, coluna };
}

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const r = await carregarPropria(param(req, "id"), closerId(req));
    if (!r.ok) return res.status(r.status).json({ error: r.error });

    const body = (req.body ?? {}) as Record<string, unknown>;
    const ehFixa = r.coluna.chave != null;

    const data: { titulo?: string; cor?: string; ordem?: number } = {};
    // Colunas fixas não podem ser renomeadas (o título identifica a etapa do funil).
    if (!ehFixa && typeof body.titulo === "string") {
      data.titulo = body.titulo.trim().slice(0, 60) || "Coluna";
    }
    if (typeof body.cor === "string") data.cor = body.cor.slice(0, 20);
    if (typeof body.ordem === "number" && Number.isFinite(body.ordem)) {
      data.ordem = Math.max(0, Math.floor(body.ordem));
    }

    const coluna = await prisma.coluna.update({ where: { id: param(req, "id") }, data });
    res.json({ coluna });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const r = await carregarPropria(param(req, "id"), closerId(req));
    if (!r.ok) return res.status(r.status).json({ error: r.error });

    // Colunas fixas do funil não podem ser excluídas.
    if (r.coluna.chave != null) {
      return res.status(400).json({ error: "Coluna fixa do funil não pode ser excluída." });
    }

    // Se a coluna tem leads, eles são realocados antes de excluir (nunca somem).
    const temLeads = (await prisma.cliente.count({ where: { colunaId: param(req, "id") } })) > 0;
    if (temLeads) {
      const destinoId = await colunaDestino(r.coluna);
      if (destinoId) {
        await prisma.cliente.updateMany({
          where: { colunaId: param(req, "id") },
          data: { colunaId: destinoId },
        });
      }
    }

    await prisma.coluna.delete({ where: { id: param(req, "id") } });
    res.json({ ok: true });
  }),
);

async function colunaDestino(excluida: {
  id: string;
  titulo: string;
  closerId: string;
  categoriaId: string | null;
}): Promise<string | null> {
  const irmas = await prisma.coluna.findMany({
    where: {
      closerId: excluida.closerId,
      categoriaId: excluida.categoriaId,
      id: { not: excluida.id },
    },
    orderBy: { ordem: "asc" },
  });

  if (excluida.titulo !== COLUNA_SEM_CATEGORIA.titulo) {
    const semCategoria = irmas.find((c) => !c.chave && c.titulo === COLUNA_SEM_CATEGORIA.titulo);
    if (semCategoria) return semCategoria.id;
    // Cria "Sem categoria" no início do quadro (desloca as demais).
    const [, criada] = await prisma.$transaction([
      prisma.coluna.updateMany({
        where: { closerId: excluida.closerId, categoriaId: excluida.categoriaId },
        data: { ordem: { increment: 1 } },
      }),
      prisma.coluna.create({
        data: {
          ...COLUNA_SEM_CATEGORIA,
          chave: null,
          ordem: 0,
          closerId: excluida.closerId,
          categoriaId: excluida.categoriaId,
        },
      }),
    ]);
    return criada.id;
  }

  const livre = irmas.find((c) => !c.chave);
  return (livre ?? irmas[0])?.id ?? null;
}

export default router;
