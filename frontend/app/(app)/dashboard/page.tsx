import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { apiServerJson } from "@/lib/api-server";
import { apiUrl } from "@/lib/api";
import {
  calcularProgressoPorCloser,
  compararMelhorResultado,
  progressoVazio,
  type ProgressoCloser,
} from "@/lib/progress";
import type { ChaveColuna } from "@/config/colunas";
import type { ChecklistField } from "@/config/checklist";
import Counter from "@/components/Counter";
import Donut from "@/components/charts/Donut";
import BarChart from "@/components/charts/BarChart";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import { buildPresentationData } from "@/lib/presentation";

export const dynamic = "force-dynamic";

type ClienteProgresso = {
  closerId: string;
  coluna: { chave: string | null } | null;
} & Record<ChecklistField, boolean>;

function KpiCard({
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

function MiniInd({
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
          ? "text-brand-600"
          : "text-ink";
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2">
      <div className={`font-display text-lg font-bold ${cor}`}>
        <Counter value={valor} suffix={suffix} />
      </div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-ink-soft">{label}</div>
    </div>
  );
}

function CloserCard({
  id,
  nome,
  p,
  href,
  meu = false,
}: {
  id: string;
  nome: string;
  p: ProgressoCloser;
  /** Card clicável (closer logado ou gestor): abre o detalhe do closer. */
  href?: string;
  meu?: boolean;
}) {
  const card = (
    <div
      className={`glass rounded-3xl border border-white/10 p-5 card-elev transition hover:-translate-y-0.5 ${
        href ? "cursor-pointer hover:border-brand-400/60 hover:shadow-brand" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={apiUrl(`/api/closers/${id}/avatar`)}
          alt={nome}
          className="h-16 w-16 rounded-2xl object-cover ring-2 ring-brand-500/40"
        />
        <div className="flex-1">
          <div className="font-display text-lg font-bold text-ink">{nome}</div>
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">Closer</div>
        </div>
        <Donut
          value={p.taxaRecuperacao}
          size={92}
          stroke={10}
          label={`${Math.round(p.taxaRecuperacao * 100)}%`}
          sublabel="Recup."
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniInd label="Leads" valor={p.leadsCadastrados} tom="brand" />
        <MiniInd label="Agendamentos" valor={p.agendamentos} />
        <MiniInd label="Meshow" valor={p.meshow} tom="brand" />
        <MiniInd label="No-shows" valor={p.noShows} tom="vermelho" />
        <MiniInd label="Recuperados" valor={p.recuperados} tom="verde" />
        <MiniInd label="Interesse méd." valor={p.interesseMedio} suffix="%" tom="brand" />
      </div>

      {href && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-500/10 px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-400">
            {meu ? "Meu painel" : "Visão do gestor"}
          </span>
          <span className="text-xs font-bold text-brand-400">Ver desempenho completo →</span>
        </div>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  const { ok, data } = await apiServerJson<{
    closers: { id: string; nome: string }[];
    clientes: ClienteProgresso[];
  }>("/api/views/dashboard");
  if (!ok || !data) redirect("/login");
  const { closers, clientes } = data;

  const progressoMap = calcularProgressoPorCloser(
    clientes.map(({ coluna, ...c }) => ({
      ...c,
      etapa: (coluna?.chave ?? null) as ChaveColuna | null,
    })),
  );
  // Sempre do melhor resultado para o pior (cards, gráficos e apresentação).
  const lista = closers
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      p: progressoMap.get(c.id) ?? progressoVazio(),
    }))
    .sort(compararMelhorResultado);

  const tot = lista.reduce(
    (a, { p }) => ({
      leads: a.leads + p.leadsCadastrados,
      recuperados: a.recuperados + p.recuperados,
      agendamentos: a.agendamentos + p.agendamentos,
      meshow: a.meshow + p.meshow,
      somaScore: a.somaScore + p._somaScore,
    }),
    { leads: 0, recuperados: 0, agendamentos: 0, meshow: 0, somaScore: 0 },
  );
  const taxaGlobal = tot.leads > 0 ? tot.recuperados / tot.leads : 0;

  const primeiroNome = (n: string) => n.split(/\s+/)[0];

  const presentationData = buildPresentationData(closers, progressoMap);

  return (
    <DashboardTabs presentation={presentationData}>
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-brand-gradient p-6 text-white shadow-brand animate-rise sm:p-8">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl animate-float" />
        <div className="absolute -bottom-20 left-10 h-52 w-52 rounded-full bg-white/10 blur-3xl animate-float-slow" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              Visão geral · somente leitura
            </span>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Dashboard do funil
            </h1>
            <p className="mt-2 max-w-md text-sm text-white/85">
              Progresso de todos os closers em recuperar clientes de fundo de funil.
            </p>
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

      {/* KPIs globais */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Leads cadastrados" valor={tot.leads} tom="brand" />
        <KpiCard label="Recuperados" valor={tot.recuperados} tom="verde" />
        <KpiCard label="Agendamentos" valor={tot.agendamentos} />
        <KpiCard label="Meshow" valor={tot.meshow} tom="brand" />
      </section>

      {/* Cards por closer */}
      <section>
        <h2 className="mb-4 font-display text-xl font-bold text-ink">Progresso por closer</h2>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {lista.map(({ id, nome, p }) => (
            <CloserCard
              key={id}
              id={id}
              nome={nome}
              p={p}
              href={id === session?.sub || session?.isAdmin ? `/dashboard/${id}` : undefined}
              meu={id === session?.sub}
            />
          ))}
        </div>
      </section>

      {/* Comparativos */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="glass rounded-3xl border border-white/10 p-6 card-elev">
          <h3 className="mb-4 font-display text-lg font-bold text-ink">Recuperados por closer</h3>
          <BarChart data={lista.map(({ nome, p }) => ({ label: primeiroNome(nome), value: p.recuperados }))} />
        </div>
        <div className="glass rounded-3xl border border-white/10 p-6 card-elev">
          <h3 className="mb-4 font-display text-lg font-bold text-ink">Interesse médio por closer</h3>
          <BarChart
            data={lista.map(({ nome, p }) => ({ label: primeiroNome(nome), value: p.interesseMedio }))}
            unit="%"
          />
        </div>
      </section>
    </div>
    </DashboardTabs>
  );
}
