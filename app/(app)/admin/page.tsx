import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import {
  calcularProgressoPorCloser,
  compararMelhorResultado,
  progressoVazio,
} from "@/lib/progress";
import type { ChaveColuna } from "@/config/colunas";
import Counter from "@/components/Counter";
import Donut from "@/components/charts/Donut";
import EquipeAdmin, { type CloserAdminDTO } from "@/components/admin/EquipeAdmin";

export const dynamic = "force-dynamic";

function Kpi({
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

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/dashboard");

  const [closers, clientes] = await Promise.all([
    prisma.closer.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, email: true, ativo: true, isAdmin: true },
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

  const equipe: CloserAdminDTO[] = closers
    .map((c) => ({ c, p: progressoMap.get(c.id) ?? progressoVazio() }))
    .sort((a, b) => compararMelhorResultado({ nome: a.c.nome, p: a.p }, { nome: b.c.nome, p: b.p }))
    .map(({ c, p }) => ({
      id: c.id,
      nome: c.nome,
      email: c.email,
      ativo: c.ativo,
      isAdmin: c.isAdmin,
      leads: p.leadsCadastrados,
      recuperados: p.recuperados,
      taxa: p.taxaRecuperacao,
      interesse: p.interesseMedio,
    }));

  const tot = [...progressoMap.values()].reduce(
    (a, p) => ({
      leads: a.leads + p.leadsCadastrados,
      recuperados: a.recuperados + p.recuperados,
      agendamentos: a.agendamentos + p.agendamentos,
      meshow: a.meshow + p.meshow,
      noShows: a.noShows + p.noShows,
      quentes: a.quentes + p.quentes,
      somaScore: a.somaScore + p._somaScore,
    }),
    { leads: 0, recuperados: 0, agendamentos: 0, meshow: 0, noShows: 0, quentes: 0, somaScore: 0 },
  );
  const taxaGlobal = tot.leads > 0 ? tot.recuperados / tot.leads : 0;
  const interesseGeral = tot.leads > 0 ? Math.round(tot.somaScore / tot.leads) : 0;
  const ativos = closers.filter((c) => c.ativo).length;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-brand-gradient p-6 text-white shadow-brand animate-rise sm:p-8">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl animate-float" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              Painel do gestor
            </span>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Administração
            </h1>
            <p className="mt-2 max-w-md text-sm text-white/85">
              Gestão da equipe, visão consolidada e relatórios da operação de fundo de funil.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="/api/admin/export/relatorio"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand-700 shadow-lg transition hover:bg-brand-50"
              >
                ⬇ Relatório (PDF)
              </a>
              <Link
                href="/admin/relatorio"
                className="rounded-xl bg-white/20 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/30"
              >
                Ver na tela
              </Link>
              <a
                href="/api/admin/export/leads"
                className="rounded-xl bg-white/20 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/30"
              >
                Leads (CSV)
              </a>
              <a
                href="/api/admin/export/desempenho"
                className="rounded-xl bg-white/20 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/30"
              >
                Desempenho (CSV)
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-white/15 p-4 backdrop-blur">
            <Donut
              value={taxaGlobal}
              size={108}
              stroke={12}
              label={`${Math.round(taxaGlobal * 100)}%`}
              sublabel="Global"
            />
            <div className="text-sm">
              <div className="font-display text-2xl font-extrabold">
                <Counter value={tot.recuperados} />/<Counter value={tot.leads} />
              </div>
              <div className="text-white/80">Recuperados / Leads</div>
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        <Kpi label="Closers ativos" valor={ativos} tom="brand" />
        <Kpi label="Leads" valor={tot.leads} />
        <Kpi label="Recuperados" valor={tot.recuperados} tom="verde" />
        <Kpi label="No-shows" valor={tot.noShows} tom="vermelho" />
        <Kpi label="Leads quentes" valor={tot.quentes} tom="brand" />
        <Kpi label="Interesse geral" valor={interesseGeral} suffix="%" tom="brand" />
      </section>

      {/* Equipe */}
      <EquipeAdmin closers={equipe} meuId={session.sub} />
    </div>
  );
}
