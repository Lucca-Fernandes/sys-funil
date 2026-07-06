import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { apiServerJson } from "@/lib/api-server";
import { apiUrl } from "@/lib/api";
import { RELATORIO_BRAND, ETAPA_COR, type RelatorioDados } from "@/lib/relatorio-types";
import PrintButton from "@/components/admin/PrintButton";

export const dynamic = "force-dynamic";

const BRAND = RELATORIO_BRAND;

/** Barra horizontal estática (imprime fiel — sem animação). */
function Barra({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, (valor / Math.max(1, max)) * 100)}%`, backgroundColor: cor }}
      />
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-9 break-inside-avoid">
      <h2 className="border-b-2 pb-2 font-display text-lg font-extrabold text-slate-900" style={{ borderColor: BRAND }}>
        {titulo}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function RelatorioPage() {
  const session = await getAdminSession();
  if (!session) redirect("/dashboard");

  const { ok, data } = await apiServerJson<{ dados: RelatorioDados }>("/api/views/relatorio");
  if (!ok || !data) redirect("/dashboard");
  const r = data.dados;

  return (
    <div className="space-y-5">
      {/* Ações (fora do documento; somem na impressão) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin"
          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-white/5 hover:text-ink"
        >
          ← Voltar ao admin
        </Link>
        <div className="flex flex-wrap gap-2">
          <a
            href={apiUrl("/api/admin/export/leads")}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-white/5 hover:text-ink"
          >
            Leads (CSV)
          </a>
          <a
            href={apiUrl("/api/admin/export/desempenho")}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-white/5 hover:text-ink"
          >
            Desempenho (CSV)
          </a>
          <PrintButton />
          <a
            href={apiUrl("/api/admin/export/relatorio")}
            className="rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-brand transition hover:brightness-105"
          >
            ⬇ Baixar PDF
          </a>
        </div>
      </div>

      {/* Documento */}
      <div className="print-doc mx-auto max-w-4xl rounded-3xl bg-white p-5 text-slate-900 shadow-2xl sm:p-8 lg:p-10">
        {/* Cabeçalho */}
        <header
          className="flex flex-col gap-4 border-b-4 pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
          style={{ borderColor: BRAND }}
        >
          <div>
            <div className="font-display text-2xl font-extrabold tracking-tight">
              mee<span style={{ color: BRAND }}>ventos</span>
            </div>
            <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
              Relatório de Desempenho
              <span className="block text-lg font-bold text-slate-500 sm:text-xl">
                Recuperação de clientes · Fundo de Funil
              </span>
            </h1>
          </div>
          <div className="shrink-0 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:text-right">
            <div>
              Gerado em <strong className="text-slate-700">{r.geradoEm}</strong>
            </div>
            <div className="mt-1">
              Equipe: <strong className="text-slate-700">{r.closersAtivos} closers ativos</strong>
            </div>
            <div className="mt-1">
              Emitido por <strong className="text-slate-700">{r.emitidoPor}</strong>
            </div>
          </div>
        </header>

        {/* Sumário executivo */}
        <Secao titulo="1 · Sumário executivo">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {r.kpis.map((k) => (
              <div key={k.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="font-display text-2xl font-extrabold" style={{ color: k.cor ?? "#0f172a" }}>
                  {k.valor}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {k.label}
                </div>
              </div>
            ))}
          </div>
        </Secao>

        {/* Funil */}
        <Secao titulo="2 · Funil consolidado">
          <div className="space-y-3">
            {r.funil.map((f) => (
              <div key={f.label}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-semibold">{f.label}</span>
                  <span className="text-slate-500">
                    <strong className="text-slate-900">{f.count}</strong> · {f.conv}
                  </span>
                </div>
                <Barra valor={f.count} max={r.totalLeads} cor={f.cor} />
              </div>
            ))}
          </div>
        </Secao>

        {/* Ranking */}
        <Secao titulo="3 · Ranking da equipe">
          <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-2 font-semibold">#</th>
                <th className="py-2 pr-2 font-semibold">Closer</th>
                <th className="py-2 pr-2 text-right font-semibold">Leads</th>
                <th className="py-2 pr-2 text-right font-semibold">Agend.</th>
                <th className="py-2 pr-2 text-right font-semibold">Meshow</th>
                <th className="py-2 pr-2 text-right font-semibold">No-show</th>
                <th className="py-2 pr-2 text-right font-semibold">Recup.</th>
                <th className="py-2 pr-2 text-right font-semibold">Taxa</th>
                <th className="py-2 text-right font-semibold">Interesse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {r.ranking.map((c, i) => (
                <tr key={c.nome + i} className={c.ativo ? "" : "text-slate-400"}>
                  <td className="py-2 pr-2 font-bold" style={{ color: c.top ? BRAND : undefined }}>
                    {i + 1}º
                  </td>
                  <td className="py-2 pr-2 font-semibold">
                    {c.nome}
                    {c.top && (
                      <span
                        className="ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
                        style={{ backgroundColor: BRAND }}
                      >
                        Top
                      </span>
                    )}
                    {!c.ativo && (
                      <span className="ml-1.5 text-[9px] font-bold uppercase">(desativado)</span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right">{c.leads}</td>
                  <td className="py-2 pr-2 text-right">{c.agendamentos}</td>
                  <td className="py-2 pr-2 text-right">{c.meshow}</td>
                  <td className="py-2 pr-2 text-right">{c.noShows}</td>
                  <td className="py-2 pr-2 text-right font-bold" style={{ color: ETAPA_COR.recuperados }}>
                    {c.recuperados}
                  </td>
                  <td className="py-2 pr-2 text-right font-semibold">{c.taxa}%</td>
                  <td className="py-2 text-right">{c.interesse}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Secao>

        {/* Temperatura + canais */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-8">
          <Secao titulo="4 · Temperatura da base">
            <div className="space-y-3">
              {r.niveis.map((nv) => (
                <div key={nv.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold">{nv.label}</span>
                    <span className="text-slate-500">
                      <strong className="text-slate-900">{nv.count}</strong> · {nv.pct}%
                    </span>
                  </div>
                  <Barra valor={nv.count} max={r.totalLeads} cor={nv.cor} />
                </div>
              ))}
            </div>
          </Secao>

          <Secao titulo="5 · Canais de contato">
            {r.canais.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum canal registrado.</p>
            ) : (
              <div className="space-y-3">
                {r.canais.map((c) => (
                  <div key={c.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold">{c.label}</span>
                      <span className="font-bold">{c.value}</span>
                    </div>
                    <Barra valor={c.value} max={Math.max(...r.canais.map((x) => x.value))} cor={c.cor} />
                  </div>
                ))}
              </div>
            )}
          </Secao>
        </div>

        {/* Segmentos */}
        <Secao titulo="6 · Principais segmentos">
          <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-2 sm:gap-x-8">
            {r.segmentos.map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">{s.label}</span>
                  <span className="text-slate-500">
                    <strong className="text-slate-900">{s.value}</strong> · {s.pct}%
                  </span>
                </div>
                <Barra valor={s.value} max={r.segmentos[0]?.value ?? 1} cor={BRAND} />
              </div>
            ))}
          </div>
        </Secao>

        {/* Oportunidades */}
        <Secao titulo="7 · Leads quentes em aberto">
          {r.quentes.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum lead quente em aberto.</p>
          ) : (
            <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[26rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-2 font-semibold">Lead</th>
                  <th className="py-2 pr-2 font-semibold">Segmento</th>
                  <th className="py-2 pr-2 font-semibold">Closer</th>
                  <th className="py-2 text-right font-semibold">Interesse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {r.quentes.map((q) => (
                  <tr key={q.nome + q.closer}>
                    <td className="py-2 pr-2 font-semibold">{q.nome}</td>
                    <td className="py-2 pr-2 text-slate-600">{q.segmento}</td>
                    <td className="py-2 pr-2 text-slate-600">{q.closer}</td>
                    <td className="py-2 text-right font-bold" style={{ color: "#ef4444" }}>
                      {q.score}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Secao>

        {/* Por closer: quadros/categorias */}
        <Secao titulo="8 · Desempenho individual por quadro">
          <div className="space-y-5">
            {r.porCloser.map((c) => (
              <div key={c.nome} className="break-inside-avoid rounded-2xl border border-slate-200 p-4">
                <div className="mb-2 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                  <div className="font-display text-base font-extrabold">{c.nome}</div>
                  <div className="text-xs text-slate-500">
                    {c.leads} leads ·{" "}
                    <strong style={{ color: ETAPA_COR.recuperados }}>
                      {c.recuperados} recuperados
                    </strong>{" "}
                    · taxa {c.taxa}%
                  </div>
                </div>
                <div className="-mx-1 overflow-x-auto px-1">
                <table className="w-full min-w-[30rem] text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-[9px] uppercase tracking-wide text-slate-400">
                      <th className="py-1.5 pr-2 font-semibold">Quadro</th>
                      <th className="py-1.5 pr-2 text-right font-semibold">Leads</th>
                      <th className="py-1.5 pr-2 text-right font-semibold">Agend.</th>
                      <th className="py-1.5 pr-2 text-right font-semibold">Meshow</th>
                      <th className="py-1.5 pr-2 text-right font-semibold">No-show</th>
                      <th className="py-1.5 pr-2 text-right font-semibold">Recup.</th>
                      <th className="py-1.5 text-right font-semibold">Interesse</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {c.quadros.map((q) => (
                      <tr key={q.nome}>
                        <td className="py-1.5 pr-2 font-semibold">{q.nome}</td>
                        <td className="py-1.5 pr-2 text-right">{q.leads}</td>
                        <td className="py-1.5 pr-2 text-right">{q.agendamentos}</td>
                        <td className="py-1.5 pr-2 text-right">{q.meshow}</td>
                        <td className="py-1.5 pr-2 text-right">{q.noShows}</td>
                        <td className="py-1.5 pr-2 text-right font-bold" style={{ color: ETAPA_COR.recuperados }}>
                          {q.recuperados}
                        </td>
                        <td className="py-1.5 text-right">{q.interesse}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            ))}
          </div>
        </Secao>

        <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400">
          Relatório gerado automaticamente {r.geradoEm}
        </footer>
      </div>
    </div>
  );
}
