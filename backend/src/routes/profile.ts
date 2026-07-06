import { Router } from "express";
import multer from "multer";
import { prisma } from "@/lib/prisma";
import { requireAuth, denyIfMustChange } from "@/middleware/auth";
import { asyncHandler, closerId } from "@/lib/http";

const TAMANHO_MAX = 4 * 1024 * 1024; // 4 MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: TAMANHO_MAX } });

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

const router = Router();
router.use(requireAuth, denyIfMustChange);

router.post(
  "/avatar",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Nenhum arquivo enviado." });

    // Uint8Array com ArrayBuffer próprio (evita SharedArrayBuffer no tipo do Prisma).
    const bytes = new Uint8Array(file.buffer);
    const tipo = tipoPorAssinatura(bytes);
    if (!tipo) {
      return res.status(400).json({ error: "Formato não suportado. Use PNG, JPG, WEBP ou GIF." });
    }

    await prisma.closer.update({
      where: { id: closerId(req) },
      data: { avatarData: bytes, avatarMimeType: tipo },
    });
    res.json({ ok: true });
  }),
);

router.delete(
  "/avatar",
  asyncHandler(async (req, res) => {
    await prisma.closer.update({
      where: { id: closerId(req) },
      data: { avatarData: null, avatarMimeType: null },
    });
    res.json({ ok: true });
  }),
);

export default router;
