import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword, validarNovaSenha } from "@/lib/password";
import { setSessionCookie, clearSessionCookie } from "@/lib/session";
import { requireAuth } from "@/middleware/auth";
import { asyncHandler } from "@/lib/http";

const router = Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as { email?: string; senha?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const senha = String(body.senha ?? "");

    if (!email || !senha) {
      return res.status(400).json({ error: "Informe e-mail e senha." });
    }

    const closer = await prisma.closer.findUnique({ where: { email } });

    // Mensagem genérica para não revelar se o e-mail existe.
    const senhaOk = closer ? await verifyPassword(senha, closer.senhaHash) : false;
    if (!closer || !senhaOk) {
      return res.status(401).json({ error: "E-mail ou senha inválidos." });
    }
    if (!closer.ativo) {
      return res.status(403).json({ error: "Acesso desativado. Fale com o gestor." });
    }

    await setSessionCookie(res, {
      sub: closer.id,
      nome: closer.nome,
      email: closer.email,
      mustChangePassword: closer.mustChangePassword,
      isAdmin: closer.isAdmin,
    });

    res.json({ ok: true, mustChangePassword: closer.mustChangePassword });
  }),
);

router.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  }),
);

router.get("/me", requireAuth, (req, res) => {
  const s = req.session!;
  res.json({
    id: s.sub,
    nome: s.nome,
    email: s.email,
    mustChangePassword: s.mustChangePassword,
    isAdmin: s.isAdmin,
  });
});

router.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const body = (req.body ?? {}) as { senhaAtual?: string; novaSenha?: string };
    const senhaAtual = String(body.senhaAtual ?? "");
    const novaSenha = String(body.novaSenha ?? "");

    const erroSenha = validarNovaSenha(novaSenha);
    if (erroSenha) return res.status(400).json({ error: erroSenha });

    const closer = await prisma.closer.findUnique({ where: { id: session.sub } });
    if (!closer) return res.status(404).json({ error: "Closer não encontrado." });

    if (!(await verifyPassword(senhaAtual, closer.senhaHash))) {
      return res.status(400).json({ error: "Senha atual incorreta." });
    }
    if (await verifyPassword(novaSenha, closer.senhaHash)) {
      return res.status(400).json({ error: "A nova senha deve ser diferente da atual." });
    }

    const senhaHash = await hashPassword(novaSenha);
    const atualizado = await prisma.closer.update({
      where: { id: closer.id },
      data: { senhaHash, mustChangePassword: false },
    });

    // Reemite o cookie com mustChangePassword = false.
    await setSessionCookie(res, {
      sub: atualizado.id,
      nome: atualizado.nome,
      email: atualizado.email,
      mustChangePassword: false,
      isAdmin: atualizado.isAdmin,
    });

    res.json({ ok: true });
  }),
);

export default router;
