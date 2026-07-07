import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { calcularProgressoPorCloser, progressoVazio, type ProgressoCloser } from "@/lib/progress";
import type { ChaveColuna } from "@/config/colunas";
import { CANAIS, CONTATOS_MIN, DIVERSIDADE_MIN } from "@/config/channels";
import Counter from "@/components/Counter";
import Donut from "@/components/charts/Donut";
import BarChart from "@/components/charts/BarChart";
import HBarList, { type HBarDatum } from "@/components/charts/HBarList";

export const dynamic = "force-dynamic";

const NIVEIS = [
  { chave: "quentes", label: "Quentes", cor: "#ef4444" },
  { chave: "mornos", label: "Mornos", cor: "#f59e0b" },
  { chave: "frios", label: "Frios", cor: "#22c55e" },
] as const;

type ClienteRow = Awaited<ReturnType<typeof carregarClientes>>[number];

function carregarClientes(closerId: string) {
  return prisma.cliente.findMany({
    where: { closerId },
    include: {
      coluna: {
        select: { id: true, titulo: true, cor: true, chave: true, ordem: true, categoriaId: true },
      },
    },
  });
}

/** Indicadores de um conjunto de leads (mesma régua do dashboard geral). */
function statsDe(leads: ClienteRow[]): ProgressoCloser {
  const input = leads.map((c) => ({
    ...c,
    etapa: (c.coluna?.chave ?? null) as ChaveColuna | null,
  }));
  return calcularProgressoPorCloser(input).values().next().value ?? progressoVazio();
}

function StatTile({
  label,
  valor,
  suffix = "",
  tom = "ink",
}: {
  label: string;
  valor: number;
  suffix?: string;
  tom?: "ink" | "verde" | "vermelho" | "brand";
}) {
  const cor =
    tom === "verde"
      ? "text-emerald-400"
      : tom === "vermelho"
        ? "text-red-400"
        : tom === "brand"
          ? "text-gradient-brand"
          : "text-ink";
  return (
    <div className="glass rounded-2xl border border-white/10 p-5 card-elev animate-rise">
      <div className={`font-display text-3xl font-extrabold ${cor}`}>
        <Counter value={valor} suffix={suffix} />
      </div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </div>
    </div>
  );
}

function MiniStat({ label, valor, suffix = "" }: { label: string; valor: number; suffix?: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2">
      <div className="font-display text-lg font-bold text-ink">
        <Counter value={valor} suffix={suffix} />
      </div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-ink-soft">{label}</div>
    </div>
  );
}

/** Tile de meta batida: % dos leads que atingiram a meta, com barrinha. */
function MetaTile({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2">
      <div className="font-display text-lg font-bold text-gradient-brand">
        <Counter value={pct} suffix="%" />
      </div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-brand-gradient"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

function Painel({
  titulo,
  children,
  acao,
}: {
  titulo: string;
  children: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-3xl border border-white/10 p-6 card-elev">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-ink">{titulo}</h3>
        {acao}
      </div>
      {children}
    </div>
  );
}

export default async function CloserDetalhePage({
  params,
}: {
  params: Promise<{ closerId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { closerId } = await params;
  // Cada closer só abre o próprio detalhe (categorias/quadros são pessoais);
  // o gestor pode abrir o de qualquer um.
  if (session.sub !== closerId && !session.isAdmin) redirect("/dashboard");

  const [closer, categorias, colunas, clientes] = await Promise.all([
    prisma.closer.findUnique({ where: { id: closerId }, select: { id: true, nome: true } }),
    prisma.categoria.findMany({ where: { closerId }, orderBy: { ordem: "asc" } }),
    prisma.coluna.findMany({ where: { closerId }, orderBy: { ordem: "asc" } }),
    carregarClientes(closerId),
  ]);
  if (!closer) redirect("/dashboard");

  const total = statsDe(clientes);

  // Quadros = Fundo de Funil (null) + categorias. Leads órfãos contam no principal.
  const quadros = [
    { id: null as string | null, nome: "Fundo de Funil" },
    ...categorias.map((c) => ({ id: c.id as string | null, nome: c.nome })),
  ].map((q) => {
    const leads = clientes.filter((c) => (c.coluna?.categoriaId ?? null) === q.id);
    const cols = colunas.filter((k) => (k.categoriaId ?? null) === q.id);
    return {
      ...q,
      leads,
      p: statsDe(leads),
      porColuna: cols.map<HBarDatum>((k) => ({
        label: k.titulo,
        cor: k.cor,
        value: leads.filter((c) => c.colunaId === k.id).length,
      })),
    };
  });

  // Canais usados (ordem fixa do config; só os que aparecem).
  const canais: HBarDatum[] = CANAIS.map((canal) => ({
    label: canal.label,
    cor: canal.cor,
    value: clientes.filter((c) => c.canais.includes(canal.key)).length,
  })).filter((d) => d.value > 0);

  // Top segmentos (magnitude — sem cor por item).
  const porSegmento = new Map<string, number>();
  for (const c of clientes) porSegmento.set(c.segmento, (porSegmento.get(c.segmento) ?? 0) + 1);
  const segmentos: HBarDatum[] = [...porSegmento.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  // Engajamento (metas dos widgets).
  const n = clientes.length;
  const mediaContatos = n ? Math.round((clientes.reduce((s, c) => s + c.contatosRealizados, 0) / n) * 10) / 10 : 0;
  const pctMetaContatos = n
    ? Math.round((clientes.filter((c) => c.contatosRealizados >= CONTATOS_MIN).length / n) * 100)
    : 0;
  const mediaCanais = n ? Math.round((clientes.reduce((s, c) => s + c.canais.length, 0) / n) * 10) / 10 : 0;
  const pctMetaCanais = n
    ? Math.round((clientes.filter((c) => c.canais.length >= DIVERSIDADE_MIN).length / n) * 100)
    : 0;

  // Score médio por quadro (comparação entre quadros — uma medida, uma cor).
  const interessePorQuadro = quadros.map((q) => ({
    label: q.nome,
    value: q.p.interesseMedio,
  }));

  const totalNiveis = Math.max(1, total.quentes + total.mornos + total.frios);

  return (
    <div className="space-y-8">
      {/* Hero pessoal */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-brand-gradient p-6 text-white shadow-brand animate-rise sm:p-8">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl animate-float" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/closers/${closer.id}/avatar`}
              alt={closer.nome}
              className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-white/50 sm:h-20 sm:w-20"
            />
            <div>
              <Link
                href="/dashboard"
                className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide transition hover:bg-white/30"
              >
                ← Dashboard
              </Link>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                {closer.nome}
              </h1>
              <p className="mt-1 text-sm text-white/85">
                Desempenho individual · {quadros.length}{" "}
                {quadros.length === 1 ? "quadro" : "quadros"} · {n} {n === 1 ? "lead" : "leads"}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-white/15 p-4 backdrop-blur">
            <Donut
              value={total.taxaRecuperacao}
              size={108}
              stroke={12}
              label={`${Math.round(total.taxaRecuperacao * 100)}%`}
              sublabel="Recup."
            />
            <div className="text-sm">
              <div className="font-display text-2xl font-extrabold">
                <Counter value={total.recuperados} />/<Counter value={total.leadsCadastrados} />
              </div>
              <div className="text-white/80">Recuperados / Leads</div>
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        <StatTile label="Leads" valor={total.leadsCadastrados} tom="brand" />
        <StatTile label="Recuperados" valor={total.recuperados} tom="verde" />
        <StatTile label="Agendamentos" valor={total.agendamentos} />
        <StatTile label="Meshow" valor={total.meshow} tom="brand" />
        <StatTile label="No-shows" valor={total.noShows} tom="vermelho" />
        <StatTile label="Interesse méd." valor={total.interesseMedio} suffix="%" tom="brand" />
      </section>

      {/* Funil + temperatura */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Painel titulo="Etapas do funil">
          <BarChart
            data={[
              { label: "Agendamentos", value: total.agendamentos },
              { label: "Meshow", value: total.meshow },
              { label: "No-shows", value: total.noShows },
              { label: "Recuperados", value: total.recuperados },
            ]}
          />
        </Painel>

        <Painel titulo="Temperatura dos leads">
          {/* barra de proporção com respiro de 2px entre segmentos */}
          <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-white/10">
            {NIVEIS.map((nv) => (
              <div
                key={nv.chave}
                className="h-full rounded-full"
                style={{
                  width: `${(total[nv.chave] / totalNiveis) * 100}%`,
                  backgroundColor: nv.cor,
                }}
                title={`${nv.label}: ${total[nv.chave]}`}
              />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {NIVEIS.map((nv) => (
              <div key={nv.chave} className="rounded-xl bg-white/5 px-3 py-2.5">
                <div className="flex items-center gap-1.5 font-display text-lg font-bold text-ink">
                  <span
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-white/20"
                    style={{ backgroundColor: nv.cor }}
                    aria-hidden
                  />
                  <Counter value={total[nv.chave]} />
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-ink-soft">
                  {nv.label}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-soft">
            Interesse médio de compra: <strong className="text-ink">{total.interesseMedio}%</strong>{" "}
            no conjunto dos quadros.
          </p>
        </Painel>
      </section>

      {/* Canais + segmentos */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Painel titulo="Canais de contato">
          <HBarList data={canais} vazio="Nenhum canal registrado nos leads ainda" />
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="Contatos méd." valor={mediaContatos} />
            <MetaTile label={`Meta ${CONTATOS_MIN}+ contatos`} pct={pctMetaContatos} />
            <MiniStat label="Canais méd." valor={mediaCanais} />
            <MetaTile label={`Meta ${DIVERSIDADE_MIN}+ canais`} pct={pctMetaCanais} />
          </div>
        </Painel>

        <Painel titulo="Principais segmentos">
          <HBarList data={segmentos} vazio="Cadastre leads para ver os segmentos" />
        </Painel>
      </section>

      {/* Comparação entre quadros */}
      {quadros.length > 1 && (
        <Painel titulo="Interesse médio por quadro">
          <BarChart data={interessePorQuadro} unit="%" height={190} />
        </Painel>
      )}

      {/* Detalhe por quadro (Fundo de Funil + categorias) */}
      <section>
        <h2 className="mb-4 font-display text-xl font-bold text-ink">Desempenho por quadro</h2>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {quadros.map((q) => (
            <div key={q.id ?? "principal"} className="glass rounded-3xl border border-white/10 p-5 card-elev">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-display text-lg font-bold text-ink">{q.nome}</div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                    {q.leads.length} {q.leads.length === 1 ? "lead" : "leads"}
                  </div>
                </div>
                <Donut
                  value={q.p.taxaRecuperacao}
                  size={84}
                  stroke={9}
                  label={`${Math.round(q.p.taxaRecuperacao * 100)}%`}
                  sublabel="Recup."
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <MiniStat label="Agendamentos" valor={q.p.agendamentos} />
                <MiniStat label="Meshow" valor={q.p.meshow} />
                <MiniStat label="No-shows" valor={q.p.noShows} />
                <MiniStat label="Recuperados" valor={q.p.recuperados} />
                <MiniStat label="Interesse méd." valor={q.p.interesseMedio} suffix="%" />
                <MiniStat label="Quentes" valor={q.p.quentes} />
              </div>

              <div className="mt-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                  Leads por coluna
                </div>
                <HBarList data={q.porColuna} vazio="Quadro ainda sem colunas" />
              </div>

              <div className="mt-4 text-right">
                <Link
                  href={q.id ? `/fundo-de-funil?categoria=${q.id}` : "/fundo-de-funil"}
                  className="text-xs font-bold text-brand-400 transition hover:text-brand-600"
                >
                  Abrir quadro →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
