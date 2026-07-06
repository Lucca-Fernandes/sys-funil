import { Router } from "express";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { gerarSenhaTemporaria } from "@/lib/senha-temporaria";
import {
  calcularProgressoPorCloser,
  compararMelhorResultado,
  progressoVazio,
} from "@/lib/progress";
import { calcularScore, nivelInteresse } from "@/lib/score";
import { gerarCsv } from "@/lib/csv";
import { montarRelatorio } from "@/lib/relatorio";
import { criarRelatorioPdf } from "@/pdf/RelatorioPdf";
import type { ChaveColuna } from "@/config/colunas";
import { requireAdmin, denyIfMustChange } from "@/middleware/auth";
import { asyncHandler, param } from "@/lib/http";

const router = Router();
router.use(requireAdmin, denyIfMustChange);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Gestão de closers ──────────────────────────────────────────────────────

// Cria o acesso de um novo closer. A senha temporária é retornada UMA vez.
router.post(
  "/closers",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as { nome?: string; email?: string };
    const nome = String(body.nome ?? "").trim().slice(0, 120);
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);

    if (!nome) return res.status(400).json({ error: "O nome é obrigatório." });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "E-mail inválido." });

    const existente = await prisma.closer.findUnique({ where: { email } });
    if (existente) {
      return res.status(409).json({ error: "Já existe um acesso com esse e-mail." });
    }

    const senhaTemporaria = gerarSenhaTemporaria();
    const closer = await prisma.closer.create({
      data: {
        nome,
        email,
        senhaHash: await hashPassword(senhaTemporaria),
        mustChangePassword: true,
      },
      select: { id: true, nome: true, email: true, ativo: true, isAdmin: true },
    });

    res.status(201).json({ closer, senhaTemporaria });
  }),
);

// Ações do gestor sobre um closer: ativar/desativar, renomear, resetar senha.
router.patch(
  "/closers/:id",
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const id = param(req, "id");
    const closer = await prisma.closer.findUnique({ where: { id } });
    if (!closer) return res.status(404).json({ error: "Closer não encontrado." });

    const body = (req.body ?? {}) as { ativo?: boolean; nome?: string; resetarSenha?: boolean };
    const data: {
      ativo?: boolean;
      nome?: string;
      senhaHash?: string;
      mustChangePassword?: boolean;
    } = {};
    let senhaTemporaria: string | undefined;

    if (typeof body.ativo === "boolean") {
      if (id === session.sub) {
        return res.status(400).json({ error: "Você não pode desativar o próprio acesso." });
      }
      data.ativo = body.ativo;
    }

    if (typeof body.nome === "string") {
      const nome = body.nome.trim().slice(0, 120);
      if (!nome) return res.status(400).json({ error: "O nome é obrigatório." });
      data.nome = nome;
    }

    if (body.resetarSenha === true) {
      senhaTemporaria = gerarSenhaTemporaria();
      data.senhaHash = await hashPassword(senhaTemporaria);
      data.mustChangePassword = true;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "Nada para atualizar." });
    }

    const atualizado = await prisma.closer.update({
      where: { id },
      data,
      select: { id: true, nome: true, email: true, ativo: true, isAdmin: true },
    });

    res.json({ closer: atualizado, ...(senhaTemporaria ? { senhaTemporaria } : {}) });
  }),
);

// ── Exports ─────────────────────────────────────────────────────────────────

function enviarCsv(res: import("express").Response, csv: string, nomeArquivo: string) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(csv);
}

// Desempenho consolidado por closer (uma linha por closer).
router.get(
  "/export/desempenho",
  asyncHandler(async (_req, res) => {
    const [closers, clientes] = await Promise.all([
      prisma.closer.findMany({
        where: { isAdmin: false },
        select: { id: true, nome: true, email: true, ativo: true },
        orderBy: { nome: "asc" },
      }),
      prisma.cliente.findMany({
        select: {
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
        },
      }),
    ]);

    const progressoMap = calcularProgressoPorCloser(
      clientes.map(({ coluna, ...c }) => ({
        ...c,
        etapa: (coluna?.chave ?? null) as ChaveColuna | null,
      })),
    );

    const linhas = closers
      .map((c) => ({ ...c, p: progressoMap.get(c.id) ?? progressoVazio() }))
      .sort(compararMelhorResultado)
      .map((c, i) => [
        i + 1,
        c.nome,
        c.email,
        c.ativo ? "Ativo" : "Desativado",
        c.p.leadsCadastrados,
        c.p.agendamentos,
        c.p.meshow,
        c.p.noShows,
        c.p.recuperados,
        `${Math.round(c.p.taxaRecuperacao * 100)}%`,
        `${c.p.interesseMedio}%`,
        c.p.quentes,
        c.p.mornos,
        c.p.frios,
      ]);

    const csv = gerarCsv(
      [
        "Posição", "Closer", "E-mail", "Status", "Leads", "Agendamentos", "Meshow",
        "No-shows", "Recuperados", "Taxa de recuperação", "Interesse médio",
        "Quentes", "Mornos", "Frios",
      ],
      linhas,
    );

    const hoje = new Date().toISOString().slice(0, 10);
    enviarCsv(res, csv, `meeventos-desempenho-${hoje}.csv`);
  }),
);

// Todos os leads da operação (uma linha por lead).
router.get(
  "/export/leads",
  asyncHandler(async (_req, res) => {
    const [clientes, categorias] = await Promise.all([
      prisma.cliente.findMany({
        include: {
          closer: { select: { nome: true } },
          coluna: { select: { titulo: true, chave: true, categoriaId: true } },
        },
        orderBy: [{ closerId: "asc" }, { updatedAt: "desc" }],
      }),
      prisma.categoria.findMany({ select: { id: true, nome: true } }),
    ]);
    const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));
    const dataBr = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const linhas = clientes.map((c) => {
      const score = calcularScore(c);
      return [
        c.closer.nome,
        c.coluna?.categoriaId ? nomeCategoria.get(c.coluna.categoriaId) ?? "?" : "Fundo de Funil",
        c.coluna?.titulo ?? "Sem coluna",
        c.coluna?.chave ?? "",
        c.nome,
        c.segmento,
        score,
        nivelInteresse(score),
        c.contatosRealizados,
        c.canais.join(" | "),
        c.linkCliente ?? "",
        dataBr(c.createdAt),
        dataBr(c.updatedAt),
      ];
    });

    const csv = gerarCsv(
      [
        "Closer", "Quadro", "Coluna", "Etapa fixa", "Lead", "Segmento",
        "Interesse (0-100)", "Nível", "Contatos", "Canais", "Link",
        "Criado em", "Atualizado em",
      ],
      linhas,
    );

    const hoje = new Date().toISOString().slice(0, 10);
    enviarCsv(res, csv, `meeventos-leads-${hoje}.csv`);
  }),
);

// Relatório de Desempenho em PDF.
router.get(
  "/export/relatorio",
  asyncHandler(async (req, res) => {
    const dados = await montarRelatorio(req.session!.nome);
    const buffer = await renderToBuffer(criarRelatorioPdf(dados));

    const hoje = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="meeventos-relatorio-${hoje}.pdf"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(buffer);
  }),
);

export default router;
