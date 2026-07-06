// Documento PDF do Relatório de Desempenho (@react-pdf/renderer).
// Renderizado no servidor pela rota /api/admin/export/relatorio.
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/stylesheet";
import { RELATORIO_BRAND, ETAPA_COR, type RelatorioDados } from "@/lib/relatorio";

const BRAND = RELATORIO_BRAND;
const INK = "#0f172a";
const SOFT = "#64748b";
const LINHA = "#e2e8f0";

const s = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 56,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: INK,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 3,
    borderBottomColor: BRAND,
    paddingBottom: 14,
  },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  titulo: { fontSize: 20, fontFamily: "Helvetica-Bold", marginTop: 8 },
  subtitulo: { fontSize: 11, color: SOFT, marginTop: 2 },
  metaBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    fontSize: 8,
    color: SOFT,
    textAlign: "right",
  },
  metaForte: { color: "#334155", fontFamily: "Helvetica-Bold" },
  secao: { marginTop: 18 },
  secaoTitulo: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 1.5,
    borderBottomColor: BRAND,
    paddingBottom: 4,
    marginBottom: 8,
  },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  kpi: {
    width: "23.8%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: LINHA,
    borderRadius: 8,
    padding: 8,
  },
  kpiValor: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  kpiLabel: { fontSize: 6.5, color: SOFT, marginTop: 2, textTransform: "uppercase" },
  barraFundo: {
    height: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 3,
  },
  barra: { height: "100%", borderRadius: 3 },
  linhaEntre: { flexDirection: "row", justifyContent: "space-between", marginTop: 7 },
  duasColunas: { flexDirection: "row", gap: 18 },
  coluna: { flex: 1 },
  th: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINHA,
    paddingBottom: 4,
    marginBottom: 2,
  },
  thTexto: { fontSize: 6.5, color: SOFT, textTransform: "uppercase", fontFamily: "Helvetica-Bold" },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 4,
  },
  cardCloser: {
    borderWidth: 1,
    borderColor: LINHA,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  rodape: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: LINHA,
    paddingTop: 6,
    fontSize: 7,
    color: "#94a3b8",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function Barra({ pct, cor }: { pct: number; cor: string }) {
  return (
    <View style={s.barraFundo}>
      <View style={[s.barra, { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: cor }]} />
    </View>
  );
}

function Secao({ titulo, children, quebra }: { titulo: string; children: React.ReactNode; quebra?: boolean }) {
  return (
    <View style={s.secao} break={quebra}>
      <Text style={s.secaoTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

const b = (extra?: Style): Style => ({ fontFamily: "Helvetica-Bold", ...extra });

export function criarRelatorioPdf(r: RelatorioDados) {
  const maxCanal = Math.max(1, ...r.canais.map((c) => c.value));
  const maxSeg = r.segmentos[0]?.value ?? 1;

  return (
    <Document
      title="Relatório de Desempenho — meeventos"
      author={`meeventos · ${r.emitidoPor}`}
      subject="Recuperação de clientes de fundo de funil"
    >
      <Page size="A4" style={s.page} wrap>
        {/* Cabeçalho */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>
              mee<Text style={{ color: BRAND }}>ventos</Text>
            </Text>
            <Text style={s.titulo}>Relatório de Desempenho</Text>
            <Text style={s.subtitulo}>Recuperação de clientes · Fundo de Funil</Text>
          </View>
          <View style={s.metaBox}>
            <Text>
              Gerado em <Text style={s.metaForte}>{r.geradoEm}</Text>
            </Text>
            <Text style={{ marginTop: 3 }}>
              Equipe: <Text style={s.metaForte}>{r.closersAtivos} closers ativos</Text>
            </Text>
            <Text style={{ marginTop: 3 }}>
              Emitido por <Text style={s.metaForte}>{r.emitidoPor}</Text>
            </Text>
          </View>
        </View>

        {/* 1 · Sumário executivo */}
        <Secao titulo="1 · Sumário executivo">
          <View style={s.kpiGrid}>
            {r.kpis.map((k) => (
              <View key={k.label} style={s.kpi}>
                <Text style={[s.kpiValor, { color: k.cor ?? INK }]}>{k.valor}</Text>
                <Text style={s.kpiLabel}>{k.label}</Text>
              </View>
            ))}
          </View>
        </Secao>

        {/* 2 · Funil */}
        <Secao titulo="2 · Funil consolidado">
          {r.funil.map((f) => (
            <View key={f.label}>
              <View style={s.linhaEntre}>
                <Text style={b()}>{f.label}</Text>
                <Text style={{ color: SOFT }}>
                  <Text style={b({ color: INK })}>{f.count}</Text> · {f.conv}
                </Text>
              </View>
              <Barra pct={f.pctBase} cor={f.cor} />
            </View>
          ))}
        </Secao>

        {/* 3 · Ranking */}
        <Secao titulo="3 · Ranking da equipe">
          <View style={s.th}>
            <Text style={[s.thTexto, { width: "6%" }]}>#</Text>
            <Text style={[s.thTexto, { width: "28%" }]}>Closer</Text>
            <Text style={[s.thTexto, { width: "9%", textAlign: "right" }]}>Leads</Text>
            <Text style={[s.thTexto, { width: "10%", textAlign: "right" }]}>Agend.</Text>
            <Text style={[s.thTexto, { width: "10%", textAlign: "right" }]}>Meshow</Text>
            <Text style={[s.thTexto, { width: "10%", textAlign: "right" }]}>No-show</Text>
            <Text style={[s.thTexto, { width: "9%", textAlign: "right" }]}>Recup.</Text>
            <Text style={[s.thTexto, { width: "9%", textAlign: "right" }]}>Taxa</Text>
            <Text style={[s.thTexto, { width: "9%", textAlign: "right" }]}>Interesse</Text>
          </View>
          {r.ranking.map((c, i) => (
            <View key={c.nome + i} style={s.tr}>
              <Text style={[{ width: "6%", fontFamily: "Helvetica-Bold" }, c.top ? { color: BRAND } : {}]}>
                {i + 1}º
              </Text>
              <Text style={[{ width: "28%", fontFamily: "Helvetica-Bold" }, c.ativo ? {} : { color: "#94a3b8" }]}>
                {c.nome}
                {c.top ? " · TOP" : ""}
                {c.ativo ? "" : " (desativado)"}
              </Text>
              <Text style={{ width: "9%", textAlign: "right" }}>{c.leads}</Text>
              <Text style={{ width: "10%", textAlign: "right" }}>{c.agendamentos}</Text>
              <Text style={{ width: "10%", textAlign: "right" }}>{c.meshow}</Text>
              <Text style={{ width: "10%", textAlign: "right" }}>{c.noShows}</Text>
              <Text style={{ width: "9%", textAlign: "right", fontFamily: "Helvetica-Bold", color: ETAPA_COR.recuperados }}>
                {c.recuperados}
              </Text>
              <Text style={{ width: "9%", textAlign: "right", fontFamily: "Helvetica-Bold" }}>{c.taxa}%</Text>
              <Text style={{ width: "9%", textAlign: "right" }}>{c.interesse}%</Text>
            </View>
          ))}
        </Secao>

        {/* 4/5 · Temperatura + canais */}
        <View style={[s.secao, s.duasColunas]}>
          <View style={s.coluna}>
            <Text style={s.secaoTitulo}>4 · Temperatura da base</Text>
            {r.niveis.map((nv) => (
              <View key={nv.label}>
                <View style={s.linhaEntre}>
                  <Text style={b()}>{nv.label}</Text>
                  <Text style={{ color: SOFT }}>
                    <Text style={b({ color: INK })}>{nv.count}</Text> · {nv.pct}%
                  </Text>
                </View>
                <Barra pct={nv.pct} cor={nv.cor} />
              </View>
            ))}
          </View>
          <View style={s.coluna}>
            <Text style={s.secaoTitulo}>5 · Canais de contato</Text>
            {r.canais.length === 0 && <Text style={{ color: SOFT }}>Nenhum canal registrado.</Text>}
            {r.canais.map((c) => (
              <View key={c.label}>
                <View style={s.linhaEntre}>
                  <Text style={b()}>{c.label}</Text>
                  <Text style={b()}>{c.value}</Text>
                </View>
                <Barra pct={(c.value / maxCanal) * 100} cor={c.cor} />
              </View>
            ))}
          </View>
        </View>

        {/* 6 · Segmentos */}
        <Secao titulo="6 · Principais segmentos">
          <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 18 }}>
            {r.segmentos.map((seg) => (
              <View key={seg.label} style={{ width: "47%" }}>
                <View style={s.linhaEntre}>
                  <Text style={b()}>{seg.label}</Text>
                  <Text style={{ color: SOFT }}>
                    <Text style={b({ color: INK })}>{seg.value}</Text> · {seg.pct}%
                  </Text>
                </View>
                <Barra pct={(seg.value / maxSeg) * 100} cor={BRAND} />
              </View>
            ))}
          </View>
        </Secao>

        {/* 7 · Quentes em aberto */}
        <Secao titulo="7 · Leads quentes em aberto">
          {r.quentes.length === 0 ? (
            <Text style={{ color: SOFT }}>Nenhum lead quente em aberto.</Text>
          ) : (
            <View>
              <View style={s.th}>
                <Text style={[s.thTexto, { width: "34%" }]}>Lead</Text>
                <Text style={[s.thTexto, { width: "30%" }]}>Segmento</Text>
                <Text style={[s.thTexto, { width: "24%" }]}>Closer</Text>
                <Text style={[s.thTexto, { width: "12%", textAlign: "right" }]}>Interesse</Text>
              </View>
              {r.quentes.map((q, i) => (
                <View key={q.nome + i} style={s.tr}>
                  <Text style={{ width: "34%", fontFamily: "Helvetica-Bold" }}>{q.nome}</Text>
                  <Text style={{ width: "30%", color: "#475569" }}>{q.segmento}</Text>
                  <Text style={{ width: "24%", color: "#475569" }}>{q.closer}</Text>
                  <Text style={{ width: "12%", textAlign: "right", fontFamily: "Helvetica-Bold", color: "#ef4444" }}>
                    {q.score}%
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Secao>

        {/* 8 · Por closer */}
        <Secao titulo="8 · Desempenho individual por quadro" quebra>
          {r.porCloser.map((c) => (
            <View key={c.nome} style={s.cardCloser} wrap={false}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontSize: 10.5, fontFamily: "Helvetica-Bold" }}>{c.nome}</Text>
                <Text style={{ color: SOFT }}>
                  {c.leads} leads ·{" "}
                  <Text style={b({ color: ETAPA_COR.recuperados })}>{c.recuperados} recuperados</Text> ·
                  taxa {c.taxa}%
                </Text>
              </View>
              <View style={s.th}>
                <Text style={[s.thTexto, { width: "34%" }]}>Quadro</Text>
                <Text style={[s.thTexto, { width: "11%", textAlign: "right" }]}>Leads</Text>
                <Text style={[s.thTexto, { width: "11%", textAlign: "right" }]}>Agend.</Text>
                <Text style={[s.thTexto, { width: "11%", textAlign: "right" }]}>Meshow</Text>
                <Text style={[s.thTexto, { width: "11%", textAlign: "right" }]}>No-show</Text>
                <Text style={[s.thTexto, { width: "11%", textAlign: "right" }]}>Recup.</Text>
                <Text style={[s.thTexto, { width: "11%", textAlign: "right" }]}>Interesse</Text>
              </View>
              {c.quadros.map((q) => (
                <View key={q.nome} style={s.tr}>
                  <Text style={{ width: "34%", fontFamily: "Helvetica-Bold" }}>{q.nome}</Text>
                  <Text style={{ width: "11%", textAlign: "right" }}>{q.leads}</Text>
                  <Text style={{ width: "11%", textAlign: "right" }}>{q.agendamentos}</Text>
                  <Text style={{ width: "11%", textAlign: "right" }}>{q.meshow}</Text>
                  <Text style={{ width: "11%", textAlign: "right" }}>{q.noShows}</Text>
                  <Text style={{ width: "11%", textAlign: "right", fontFamily: "Helvetica-Bold", color: ETAPA_COR.recuperados }}>
                    {q.recuperados}
                  </Text>
                  <Text style={{ width: "11%", textAlign: "right" }}>{q.interesse}%</Text>
                </View>
              ))}
            </View>
          ))}
        </Secao>

        {/* Rodapé em todas as páginas */}
        <View style={s.rodape} fixed>
          <Text>Relatório gerado automaticamente {r.geradoEm}</Text>
          <Text render={({ pageNumber, totalPages }) => `página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
