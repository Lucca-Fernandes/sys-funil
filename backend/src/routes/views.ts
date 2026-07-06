// Endpoints de LEITURA das páginas que antes liam o Prisma direto no server
// component. Cada um devolve os dados prontos para a página renderizar; toda a
// aggregação de negócio (progress/presentation) roda no lado do frontend a
// partir destes dados (funções puras compartilhadas), mantendo o acesso ao
// banco exclusivamente aqui no backend.
import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { ensureColunas, whereClientesDoQuadro } from "@/lib/colunas";
import { montarRelatorio } from "@/lib/relatorio";
import { CHECKLIST_FIELDS, type ChecklistField } from "@/config/checklist";
import type { ClienteDTO } from "@/lib/types";
import { requireAuth, denyIfMustChange } from "@/middleware/auth";
import { asyncHandler, closerId, param } from "@/lib/http";

const router = Router();
router.use(requireAuth, denyIfMustChange);

// Seleção dos leads usada nos agregados do dashboard/admin (checklist + etapa).
const SELECT_PROGRESSO = {
  closerId: true,
  confirmouSegmento: true,
  tempoMercado: true,
  responsavelNaCall: true,
  tamanhoEquipe: true,
  usaPlataforma: true,
  identificouDor: true,
  negociacaoFrequente: true,
  multiplasCalls: true,
  parouDeResponder: true,
  demonstrouDesmotivacao: true,
  coluna: { select: { chave: true } },
} as const;

// Dashboard geral: closers ativos + leads (para os agregados e a apresentação).
router.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    const [closers, clientes] = await Promise.all([
      prisma.closer.findMany({
        where: { ativo: true, isAdmin: false },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true },
      }),
      prisma.cliente.findMany({ select: SELECT_PROGRESSO }),
    ]);
    res.json({ closers, clientes });
  }),
);

// Detalhe de um closer. Só o próprio closer ou o gestor podem abrir.
router.get(
  "/closer/:closerId",
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const alvo = param(req, "closerId");
    if (session.sub !== alvo && !session.isAdmin) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const [closer, categorias, colunas, clientes] = await Promise.all([
      prisma.closer.findUnique({ where: { id: alvo }, select: { id: true, nome: true } }),
      prisma.categoria.findMany({ where: { closerId: alvo }, orderBy: { ordem: "asc" } }),
      prisma.coluna.findMany({ where: { closerId: alvo }, orderBy: { ordem: "asc" } }),
      prisma.cliente.findMany({
        where: { closerId: alvo },
        include: {
          coluna: {
            select: { id: true, titulo: true, cor: true, chave: true, ordem: true, categoriaId: true },
          },
        },
      }),
    ]);
    if (!closer) return res.status(404).json({ error: "Closer não encontrado." });

    res.json({ closer, categorias, colunas, clientes });
  }),
);

// Painel do gestor: todos os closers + leads (agregados).
router.get(
  "/admin",
  asyncHandler(async (req, res) => {
    if (!req.session!.isAdmin) return res.status(403).json({ error: "Acesso restrito ao gestor." });
    const [closers, clientes] = await Promise.all([
      prisma.closer.findMany({
        orderBy: { nome: "asc" },
        select: { id: true, nome: true, email: true, ativo: true, isAdmin: true },
      }),
      prisma.cliente.findMany({ select: SELECT_PROGRESSO }),
    ]);
    res.json({ closers, clientes });
  }),
);

// Relatório de desempenho (na tela) — só gestor.
router.get(
  "/relatorio",
  asyncHandler(async (req, res) => {
    if (!req.session!.isAdmin) return res.status(403).json({ error: "Acesso restrito ao gestor." });
    const dados = await montarRelatorio(req.session!.nome);
    res.json({ dados });
  }),
);

// Perfil do closer logado.
router.get(
  "/perfil",
  asyncHandler(async (req, res) => {
    const closer = await prisma.closer.findUnique({
      where: { id: closerId(req) },
      select: { id: true, nome: true, email: true, avatarData: true },
    });
    if (!closer) return res.status(404).json({ error: "Closer não encontrado." });
    res.json({
      closer: {
        id: closer.id,
        nome: closer.nome,
        email: closer.email,
        temFotoEnviada: closer.avatarData != null,
      },
    });
  }),
);

// Quadro Kanban (Fundo de Funil ou uma categoria). `?categoria=` seleciona.
router.get(
  "/fundo-de-funil",
  asyncHandler(async (req, res) => {
    const cid = closerId(req);
    const categoria = req.query.categoria !== undefined ? String(req.query.categoria) : undefined;

    const categoriasRaw = await prisma.categoria.findMany({
      where: { closerId: cid },
      orderBy: { ordem: "asc" },
    });
    const categorias = categoriasRaw.map((c) => ({ id: c.id, nome: c.nome, ordem: c.ordem }));

    const categoriaAtual = categoria ? categorias.find((c) => c.id === categoria) ?? null : null;
    if (categoria && !categoriaAtual) {
      return res.status(404).json({ error: "Categoria não encontrada." });
    }

    // ensureColunas antes dos clientes: no quadro principal ela adota os órfãos.
    const colunasRaw = await ensureColunas(cid, categoriaAtual?.id ?? null);
    const clientes = await prisma.cliente.findMany({
      where: whereClientesDoQuadro(cid, categoriaAtual?.id ?? null),
      orderBy: { updatedAt: "desc" },
    });

    const colunas = colunasRaw.map((c) => ({
      id: c.id,
      titulo: c.titulo,
      cor: c.cor,
      ordem: c.ordem,
      chave: c.chave,
    }));

    const dto: ClienteDTO[] = clientes.map((c) => {
      const checklist = Object.fromEntries(
        CHECKLIST_FIELDS.map((f) => [f, c[f]]),
      ) as Record<ChecklistField, boolean>;
      return {
        id: c.id,
        nome: c.nome,
        segmento: c.segmento,
        linkCliente: c.linkCliente,
        anotacoes: c.anotacoes,
        contatosRealizados: c.contatosRealizados,
        canais: c.canais,
        colunaId: c.colunaId,
        updatedAt: c.updatedAt.toISOString(),
        ...checklist,
      };
    });

    res.json({ categorias, categoriaAtual, colunas, clientes: dto });
  }),
);

export default router;
