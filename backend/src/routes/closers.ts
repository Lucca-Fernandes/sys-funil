import { Router } from "express";
import type { Response } from "express";
import { prisma } from "@/lib/prisma";
import { requireAuth, denyIfMustChange } from "@/middleware/auth";
import { asyncHandler, param } from "@/lib/http";

const router = Router();
router.use(requireAuth, denyIfMustChange);

function avatarFallback(res: Response, nome: string) {
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
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(svg);
}

// Foto do closer: bytes salvos no banco (avatarData) ou fallback com iniciais.
router.get(
  "/:id/avatar",
  asyncHandler(async (req, res) => {
    const closer = await prisma.closer.findUnique({ where: { id: param(req, "id") } });
    if (!closer) return res.status(404).json({ error: "Closer não encontrado." });

    if (closer.avatarData && closer.avatarMimeType) {
      res.setHeader("Content-Type", closer.avatarMimeType);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.send(Buffer.from(closer.avatarData));
    }

    return avatarFallback(res, closer.nome);
  }),
);

export default router;
