import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { requireAuth, denyIfMustChange } from "@/middleware/auth";
import { asyncHandler, closerId, param } from "@/lib/http";

const router = Router();
router.use(requireAuth, denyIfMustChange);

// Lista as categorias (quadros paralelos) do closer.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const categorias = await prisma.categoria.findMany({
      where: { closerId: closerId(req) },
      orderBy: { ordem: "asc" },
    });
    res.json({ categorias });
  }),
);

// Cria uma nova categoria (quadro). As colunas do quadro são criadas na 1ª visita.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const cid = closerId(req);
    const body = (req.body ?? {}) as { nome?: string };
    const nome = String(body.nome ?? "").trim().slice(0, 60);
    if (!nome) return res.status(400).json({ error: "O nome da categoria é obrigatório." });

    const max = await prisma.categoria.aggregate({
      where: { closerId: cid },
      _max: { ordem: true },
    });
    const ordem = (max._max.ordem ?? -1) + 1;

    const categoria = await prisma.categoria.create({ data: { nome, ordem, closerId: cid } });
    res.status(201).json({ categoria });
  }),
);

async function carregarPropria(id: string, cid: string) {
  const categoria = await prisma.categoria.findUnique({ where: { id } });
  if (!categoria || categoria.closerId !== cid) {
    return { ok: false as const, status: 404, error: "Categoria não encontrada." };
  }
  return { ok: true as const, categoria };
}

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const r = await carregarPropria(param(req, "id"), closerId(req));
    if (!r.ok) return res.status(r.status).json({ error: r.error });

    const body = (req.body ?? {}) as { nome?: string };
    const nome = String(body.nome ?? "").trim().slice(0, 60);
    if (!nome) return res.status(400).json({ error: "O nome da categoria é obrigatório." });

    const categoria = await prisma.categoria.update({ where: { id: param(req, "id") }, data: { nome } });
    res.json({ categoria });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const r = await carregarPropria(param(req, "id"), closerId(req));
    if (!r.ok) return res.status(r.status).json({ error: r.error });

    // As colunas do quadro caem em cascata; os leads ficam órfãos (colunaId null)
    // e são adotados pela coluna "Sem categoria" do quadro principal na próxima carga.
    await prisma.categoria.delete({ where: { id: param(req, "id") } });
    res.json({ ok: true });
  }),
);

export default router;
