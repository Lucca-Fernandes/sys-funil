import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { buildClienteData } from "@/lib/cliente-input";
import { colunaPertence, categoriaPertence, whereClientesDoQuadro } from "@/lib/colunas";
import { requireAuth, denyIfMustChange } from "@/middleware/auth";
import { asyncHandler, closerId, param } from "@/lib/http";

const router = Router();
router.use(requireAuth, denyIfMustChange);

// `?categoria=` filtra por quadro (vazio = principal); sem o parâmetro, lista todos.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const cid = closerId(req);
    let where: Record<string, unknown> = { closerId: cid };
    if (req.query.categoria !== undefined) {
      const id = String(req.query.categoria ?? "").trim();
      if (id && !(await categoriaPertence(id, cid))) {
        return res.status(400).json({ error: "Categoria inválida." });
      }
      where = whereClientesDoQuadro(cid, id || null);
    }
    const clientes = await prisma.cliente.findMany({ where, orderBy: { updatedAt: "desc" } });
    res.json({ clientes });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const cid = closerId(req);
    const result = buildClienteData((req.body ?? {}) as Record<string, unknown>, false);
    if ("error" in result) return res.status(400).json({ error: result.error });

    if (result.data.colunaId && !(await colunaPertence(result.data.colunaId, cid))) {
      return res.status(400).json({ error: "Coluna inválida." });
    }

    const cliente = await prisma.cliente.create({
      data: { ...(result.data as Required<typeof result.data>), closerId: cid },
    });
    res.status(201).json({ cliente });
  }),
);

// Carrega o cliente garantindo que pertence ao closer logado.
async function carregarProprio(id: string, cid: string) {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  // Não revela existência de cliente de outro closer.
  if (!cliente || cliente.closerId !== cid) {
    return { ok: false as const, status: 404, error: "Cliente não encontrado." };
  }
  return { ok: true as const, cliente };
}

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const r = await carregarProprio(param(req, "id"), closerId(req));
    if (!r.ok) return res.status(r.status).json({ error: r.error });
    res.json({ cliente: r.cliente });
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const cid = closerId(req);
    const r = await carregarProprio(param(req, "id"), cid);
    if (!r.ok) return res.status(r.status).json({ error: r.error });

    const built = buildClienteData((req.body ?? {}) as Record<string, unknown>, true);
    if ("error" in built) return res.status(400).json({ error: built.error });

    if (built.data.colunaId && !(await colunaPertence(built.data.colunaId, cid))) {
      return res.status(400).json({ error: "Coluna inválida." });
    }

    const cliente = await prisma.cliente.update({ where: { id: param(req, "id") }, data: built.data });
    res.json({ cliente });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const r = await carregarProprio(param(req, "id"), closerId(req));
    if (!r.ok) return res.status(r.status).json({ error: r.error });
    await prisma.cliente.delete({ where: { id: param(req, "id") } });
    res.json({ ok: true });
  }),
);

export default router;
