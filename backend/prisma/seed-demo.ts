// Seed de DEMONSTRAÇÃO — popula ~82 leads por closer, distribuídos entre três
// quadros (Fundo de Funil + categorias "Prospecção" e "Teste"), com perfis de
// funil distintos por closer. Cria as colunas/categorias que faltarem.
// NÃO idempotente para leads: rodar 2x duplica os leads (categorias/colunas não).
// Rodar:  npx tsx prisma/seed-demo.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { SEGMENTOS } from "../config/segmentos";
import { CANAL_KEYS } from "../config/channels";
import { COLUNAS_FIXAS, COLUNA_LIVRE_INICIAL, type ChaveColuna } from "../config/colunas";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

const rand = mulberry32(42);
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ri = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const chance = (p: number) => rand() < p;
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];

type Etapa = ChaveColuna | "novos";

// Perfil de funil por closer (pesos por etapa) — cada um com uma história.
const PERFIS: Record<string, Record<Etapa, number>> = {
  "sara@meeventos.com": { novos: 0.12, agendamento: 0.2, meshow: 0.22, noshow: 0.08, recuperados: 0.38 },
  "raquel@meeventos.com": { novos: 0.1, agendamento: 0.18, meshow: 0.24, noshow: 0.06, recuperados: 0.42 },
  "rita@meeventos.com": { novos: 0.14, agendamento: 0.22, meshow: 0.36, noshow: 0.1, recuperados: 0.18 },
  "alessandra@meeventos.com": { novos: 0.16, agendamento: 0.3, meshow: 0.24, noshow: 0.1, recuperados: 0.2 },
  "jonatha@meeventos.com": { novos: 0.2, agendamento: 0.3, meshow: 0.2, noshow: 0.12, recuperados: 0.18 },
  "melissa@meeventos.com": { novos: 0.3, agendamento: 0.26, meshow: 0.14, noshow: 0.2, recuperados: 0.1 },
  "guilherme@meeventos.com": { novos: 0.34, agendamento: 0.28, meshow: 0.16, noshow: 0.14, recuperados: 0.08 },
};
const PERFIL_PADRAO: Record<Etapa, number> = { novos: 0.2, agendamento: 0.25, meshow: 0.2, noshow: 0.15, recuperados: 0.2 };

// Fatia dos leads por quadro [Fundo de Funil, Prospecção, Teste].
const SPLIT_QUADRO: Record<string, [number, number, number]> = {
  "sara@meeventos.com": [0.58, 0.27, 0.15],
  "raquel@meeventos.com": [0.62, 0.24, 0.14],
  "rita@meeventos.com": [0.6, 0.25, 0.15],
  "alessandra@meeventos.com": [0.56, 0.28, 0.16],
  "jonatha@meeventos.com": [0.52, 0.3, 0.18],
  "melissa@meeventos.com": [0.5, 0.32, 0.18],
  "guilherme@meeventos.com": [0.48, 0.36, 0.16],
};
const SPLIT_PADRAO: [number, number, number] = [0.55, 0.28, 0.17];

const P_POSITIVO: Record<Etapa, number> = { novos: 0.25, agendamento: 0.45, meshow: 0.62, noshow: 0.35, recuperados: 0.82 };
const P_PAROU: Record<Etapa, number> = { novos: 0.15, agendamento: 0.2, meshow: 0.15, noshow: 0.75, recuperados: 0.7 };
const P_DESMOTIVADO: Record<Etapa, number> = { novos: 0.12, agendamento: 0.15, meshow: 0.1, noshow: 0.55, recuperados: 0.05 };
const CONTATOS: Record<Etapa, [number, number]> = { novos: [0, 3], agendamento: [2, 6], meshow: [3, 8], noshow: [2, 7], recuperados: [5, 10] };
const N_CANAIS: Record<Etapa, [number, number]> = { novos: [0, 2], agendamento: [1, 3], meshow: [2, 4], noshow: [1, 3], recuperados: [2, 5] };

const PREFIXOS = ["Buffet", "Espaço", "Cerimonial", "Grupo", "Casa", "Villa", "Quinta", "Salão", "Recanto", "Estação", "Ateliê", "Studio", "Chácara", "Mansão", "Terraço", "Jardim", "Arena", "Galeria", "Sítio", "Palácio"];
const SUFIXOS = ["Aurora", "Primavera", "Diamante", "Imperial", "das Flores", "Bela Vista", "Monte Verde", "Santa Clara", "do Vale", "Estrela", "Harmonia", "Alegria", "Encanto", "Horizonte", "Lumiar", "Real", "dos Ipês", "Serenata", "Splendore", "Vitória", "Golden", "Premium", "Celebrare", "Momentos", "do Bosque", "Panorama", "Maravilha", "Requinte", "do Lago", "Fascínio"];
const NOTAS = [
  "Retornou no WhatsApp, pediu proposta atualizada.",
  "Call remarcada 2x — responsável viaja muito.",
  "Achou o preço alto na 1ª conversa; reabrir com plano anual.",
  "Muito interessado no módulo financeiro.",
  "Pediu para retomar contato no próximo mês.",
  "Usava concorrente e está insatisfeito com o suporte.",
  "Decisor é o sócio; tentar call com os dois.",
  "Respondeu e-mail, prefere contato por telefone.",
  "Demo feita, ficou de apresentar internamente.",
  "Sem resposta há 3 semanas; tentar áudio no WhatsApp.",
  "Voltou a responder depois da campanha de reativação.",
  "Equipe pequena, sensível a preço.",
  "Quer migrar antes da alta temporada.",
];
const SEGMENTOS_COMUNS = ["Buffet", "Espaço de Eventos", "Decoração", "Fotografia e Filmagem", "Assessoria e Cerimonial"];

function sortear<T extends string>(pesos: Record<T, number>): T {
  const r = rand() * Object.values<number>(pesos).reduce((a, b) => a + b, 0);
  let acc = 0;
  for (const [k, p] of Object.entries(pesos) as [T, number][]) {
    acc += p;
    if (r <= acc) return k;
  }
  return Object.keys(pesos)[0] as T;
}

function sortearCanais(n: number): string[] {
  const pool = [...CANAL_KEYS];
  const out: string[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");

type BoardCols = { entrada: string; byChave: Map<ChaveColuna, string> };

// Cria (se faltar) as colunas de um quadro e devolve o mapa etapa→coluna.
async function ensureBoard(closerId: string, categoriaId: string | null): Promise<BoardCols> {
  const existentes = await prisma.coluna.findMany({ where: { closerId, categoriaId }, orderBy: { ordem: "asc" } });
  if (existentes.length === 0) {
    let ordem = 0;
    await prisma.coluna.createMany({
      data: [
        { ...COLUNA_LIVRE_INICIAL, chave: null, ordem: ordem++, closerId, categoriaId },
        ...COLUNAS_FIXAS.map((f) => ({ titulo: f.titulo, cor: f.cor, chave: f.chave, ordem: ordem++, closerId, categoriaId })),
      ],
    });
  }
  const cols = await prisma.coluna.findMany({ where: { closerId, categoriaId }, orderBy: { ordem: "asc" } });
  const byChave = new Map(cols.filter((c) => c.chave).map((c) => [c.chave as ChaveColuna, c.id]));
  const entrada = cols.find((c) => !c.chave && c.titulo === COLUNA_LIVRE_INICIAL.titulo) ?? cols.find((c) => !c.chave)!;
  return { entrada: entrada.id, byChave };
}

async function ensureCategoria(closerId: string, nome: string, ordem: number): Promise<string> {
  const found = await prisma.categoria.findFirst({ where: { closerId, nome } });
  if (found) return found.id;
  const criada = await prisma.categoria.create({ data: { closerId, nome, ordem } });
  return criada.id;
}

async function main() {
  const closers = await prisma.closer.findMany({ where: { isAdmin: false }, select: { id: true, nome: true, email: true } });
  if (closers.length === 0) throw new Error("Nenhum closer no banco — rode o seed principal antes.");

  const nomes: string[] = [];
  for (const p of PREFIXOS) for (const s of SUFIXOS) nomes.push(`${p} ${s}`);
  for (let i = nomes.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [nomes[i], nomes[j]] = [nomes[j], nomes[i]];
  }
  let nomeIdx = 0;

  for (const closer of closers) {
    const perfil = PERFIS[closer.email] ?? PERFIL_PADRAO;
    const split = SPLIT_QUADRO[closer.email] ?? SPLIT_PADRAO;
    const total = ri(78, 86);

    const prospId = await ensureCategoria(closer.id, "Prospecção", 0);
    const testeId = await ensureCategoria(closer.id, "Teste", 1);
    const boards: Record<"funil" | "prospeccao" | "teste", BoardCols> = {
      funil: await ensureBoard(closer.id, null),
      prospeccao: await ensureBoard(closer.id, prospId),
      teste: await ensureBoard(closer.id, testeId),
    };
    const boardDe = (q: "funil" | "prospeccao" | "teste") => boards[q];

    const dados = [];
    const resumo: Record<string, number> = {};
    for (let i = 0; i < total; i++) {
      const quadro = sortear({ funil: split[0], prospeccao: split[1], teste: split[2] });
      const etapa = sortear(perfil);
      const board = boardDe(quadro);
      const colunaId = etapa === "novos" ? board.entrada : board.byChave.get(etapa) ?? board.entrada;

      const pPos = P_POSITIVO[etapa];
      const [cMin, cMax] = CONTATOS[etapa];
      const [kMin, kMax] = N_CANAIS[etapa];
      const nome = nomes[nomeIdx++ % nomes.length];
      const segmento = chance(0.3) ? pick(SEGMENTOS_COMUNS) : pick(SEGMENTOS);
      const diasAtras = ri(5, 90);

      dados.push({
        nome,
        segmento,
        linkCliente: chance(0.3) ? `https://instagram.com/${slug(nome)}` : null,
        anotacoes: chance(0.55) ? (etapa === "recuperados" && chance(0.35) ? "Fechou! Onboarding agendado." : pick(NOTAS)) : null,
        contatosRealizados: ri(cMin, cMax),
        canais: sortearCanais(ri(kMin, kMax)),
        confirmouSegmento: chance(pPos),
        tempoMercado: chance(pPos),
        responsavelNaCall: chance(pPos * 0.9),
        tamanhoEquipe: chance(pPos),
        usaPlataforma: chance(pPos * 0.85),
        identificouDor: chance(pPos),
        negociacaoFrequente: chance(pPos * 0.8),
        multiplasCalls: chance(pPos * 0.75),
        parouDeResponder: chance(P_PAROU[etapa]),
        demonstrouDesmotivacao: chance(P_DESMOTIVADO[etapa]),
        colunaId,
        closerId: closer.id,
        createdAt: new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000),
      });
      resumo[quadro] = (resumo[quadro] ?? 0) + 1;
    }

    await prisma.cliente.createMany({ data: dados });
    console.log(`✓ ${closer.nome.padEnd(11)} ${total} leads — ${JSON.stringify(resumo)}`);
  }

  console.log(`\nTotal geral: ${await prisma.cliente.count()} leads no banco.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("ERRO:", e?.message ?? e);
    await prisma.$disconnect();
    process.exit(1);
  });
