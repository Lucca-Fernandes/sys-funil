"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CORES_COLUNA } from "@/config/colunas";
import { calcularScore, nivelInteresse, NIVEL_COR } from "@/lib/score";
import type { CategoriaDTO, ClienteDTO, ColunaDTO } from "@/lib/types";
import ClienteModal from "@/components/ClienteModal";

const NIVEL_EMOJI = { Quente: "🔥", Morno: "🌤️", Frio: "❄️" } as const;

type Selecao =
  | { tipo: "novo"; colunaId: string | null }
  | { tipo: "editar"; cliente: ClienteDTO }
  | null;

// Texto preto ou branco conforme a luminância da cor (contraste).
function corTexto(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "#1b1410";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#1b1410" : "#ffffff";
}

// Clareia levemente a cor (mistura com branco) — cabeçalho forte, mas um pouco mais suave.
function clarear(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return hex;
  const ch = (i: number) => parseInt(h.slice(i, i + 2), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amt).toString(16).padStart(2, "0");
  return `#${mix(ch(0))}${mix(ch(2))}${mix(ch(4))}`;
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

// ── Card de lead ──────────────────────────────────────────────────────────
function LeadCard({
  c,
  onOpen,
  onDragStart,
  onDragEnd,
  arrastando,
}: {
  c: ClienteDTO;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  arrastando: boolean;
}) {
  const score = calcularScore(c);
  const nivel = nivelInteresse(score);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", `lead:${c.id}`);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={`group cursor-pointer rounded-2xl border border-line bg-card p-3 card-elev transition hover:-translate-y-0.5 ${
        arrastando ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-display text-sm font-bold leading-tight text-ink">{c.nome}</h4>
        <span
          className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
          style={{ backgroundColor: NIVEL_COR[nivel] }}
          title={`Interesse: ${nivel}`}
        >
          {NIVEL_EMOJI[nivel]} {score}
        </span>
      </div>
      <div className="mt-0.5 text-[11px] font-medium text-brand-600">{c.segmento}</div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: NIVEL_COR[nivel] }}
        />
      </div>

      <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-soft">
        <span title="Contatos">📞 {c.contatosRealizados}</span>
        <span title="Canais">🔀 {c.canais.length}</span>
      </div>
    </div>
  );
}

// ── Coluna ────────────────────────────────────────────────────────────────
function Coluna({
  coluna,
  cards,
  onDropCliente,
  onReorder,
  onOpenCard,
  onNovo,
  onRename,
  onRecolor,
  onDelete,
  leadDrag,
  colDrag,
}: {
  coluna: ColunaDTO;
  cards: ClienteDTO[];
  onDropCliente: (clienteId: string, colunaId: string) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  onOpenCard: (c: ClienteDTO) => void;
  onNovo: () => void;
  onRename: (titulo: string) => void;
  onRecolor: (cor: string) => void;
  onDelete: () => void;
  leadDrag: { id: string | null; set: (id: string | null) => void };
  colDrag: { id: string | null; set: (id: string | null) => void };
}) {
  const [sobre, setSobre] = useState(false);
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [tituloTmp, setTituloTmp] = useState(coluna.titulo);
  const [paleta, setPaleta] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const bg = clarear(coluna.cor, 0.15);
  const txt = corTexto(bg);
  const badgeBg = txt === "#ffffff" ? "rgba(255,255,255,.22)" : "rgba(0,0,0,.12)";
  const ehFixa = coluna.chave != null; // coluna fixa do funil: não renomeia/exclui

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setSobre(true);
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSobre(false);
        const data = e.dataTransfer.getData("text/plain");
        if (data.startsWith("lead:")) {
          onDropCliente(data.slice(5), coluna.id);
        } else if (data.startsWith("col:")) {
          onReorder(data.slice(4), coluna.id);
        }
      }}
      className={`flex max-h-full w-[86vw] max-w-[20rem] shrink-0 flex-col rounded-2xl transition sm:w-72 ${
        sobre ? "ring-2 ring-brand-400" : ""
      } ${colDrag.id === coluna.id ? "opacity-50" : ""}`}
    >
      {/* Cabeçalho colorido (forte) — arrastável para reordenar */}
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", `col:${coluna.id}`);
          e.dataTransfer.effectAllowed = "move";
          colDrag.set(coluna.id);
        }}
        onDragEnd={() => colDrag.set(null)}
        className="cursor-grab rounded-t-2xl px-3 py-2.5 active:cursor-grabbing"
        style={{ background: bg, color: txt }}
      >
        <div className="flex items-center gap-2">
          <span className="select-none text-sm opacity-60">⠿</span>
          {editandoTitulo ? (
            <input
              autoFocus
              value={tituloTmp}
              onChange={(e) => setTituloTmp(e.target.value)}
              onBlur={() => {
                setEditandoTitulo(false);
                if (tituloTmp.trim() && tituloTmp !== coluna.titulo) onRename(tituloTmp.trim());
                else setTituloTmp(coluna.titulo);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setTituloTmp(coluna.titulo);
                  setEditandoTitulo(false);
                }
              }}
              className="min-w-0 flex-1 rounded-md border border-white/40 bg-white/90 px-1.5 py-0.5 text-sm font-bold text-slate-900 outline-none"
            />
          ) : (
            <button
              onClick={() => !ehFixa && setEditandoTitulo(true)}
              className={`min-w-0 flex-1 truncate text-left font-display text-sm font-extrabold ${
                ehFixa ? "cursor-default" : ""
              }`}
              style={{ color: txt }}
              title={ehFixa ? "Coluna fixa do funil" : "Clique para renomear"}
            >
              {coluna.titulo}
              {ehFixa && <span className="ml-0.5 opacity-70">*</span>}
            </button>
          )}
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold"
            style={{ background: badgeBg, color: txt }}
          >
            {cards.length}
          </span>
        </div>

        <div className="mt-2 flex items-center">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setPaleta((v) => !v)}
              className="h-6 w-6 rounded-full shadow-sm ring-2 ring-white/70 transition hover:scale-110"
              style={{ backgroundColor: coluna.cor }}
              title="Trocar cor"
              aria-label="Trocar cor da coluna"
            />
            {paleta && (
              <div className="absolute left-0 top-8 z-30 w-52 rounded-xl border border-line bg-card p-3 text-ink shadow-xl">
                <div className="mb-2 text-[11px] font-semibold text-ink-soft">Cor da coluna</div>
                <div className="flex flex-wrap gap-2">
                  {CORES_COLUNA.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => {
                        onRecolor(cor);
                        setPaleta(false);
                      }}
                      className="h-7 w-7 shrink-0 rounded-full ring-1 ring-black/10 transition hover:scale-110"
                      style={{ backgroundColor: cor }}
                      aria-label={`cor ${cor}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {!ehFixa && (
            <div className="relative ml-auto shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDel(true)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition hover:bg-red-600"
                title="Excluir coluna"
                aria-label="Excluir coluna"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
              {confirmDel && (
                <div className="absolute right-0 top-8 z-30 w-44 rounded-xl border border-line bg-card p-2.5 text-ink shadow-xl">
                  <p className="mb-2 text-xs font-medium">Excluir esta coluna?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={onDelete}
                      className="flex-1 rounded-lg bg-red-500 px-2 py-1 text-xs font-bold text-white transition hover:bg-red-600"
                    >
                      Excluir
                    </button>
                    <button
                      onClick={() => setConfirmDel(false)}
                      className="flex-1 rounded-lg border border-white/10 px-2 py-1 text-xs font-semibold text-ink-soft transition hover:bg-white/5"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Corpo (drop zone dos leads) — a lista rola verticalmente por dentro */}
      <div
        className={`flex min-h-40 flex-1 flex-col rounded-b-2xl border border-t-0 p-2 transition ${
          sobre ? "border-brand-400 bg-brand-500/10" : "border-white/10 bg-white/5"
        }`}
      >
        <div className="scroll-fino flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain">
          {cards.map((c) => (
            <LeadCard
              key={c.id}
              c={c}
              arrastando={leadDrag.id === c.id}
              onOpen={() => onOpenCard(c)}
              onDragStart={() => leadDrag.set(c.id)}
              onDragEnd={() => leadDrag.set(null)}
            />
          ))}
          {cards.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/15 py-6 text-center text-xs text-ink-soft">
              Arraste leads para cá
            </div>
          )}
        </div>
        <button
          onClick={onNovo}
          className="mt-2 shrink-0 rounded-xl border border-dashed border-brand-500/30 py-1.5 text-xs font-semibold text-brand-400 transition hover:bg-brand-500/10"
        >
          + Lead
        </button>
      </div>
    </div>
  );
}

// ── Board ─────────────────────────────────────────────────────────────────
export default function KanbanBoard({
  colunasIniciais,
  clientesIniciais,
  categorias,
  categoriaAtual,
}: {
  colunasIniciais: ColunaDTO[];
  clientesIniciais: ClienteDTO[];
  categorias: CategoriaDTO[];
  categoriaAtual: CategoriaDTO | null;
}) {
  const router = useRouter();
  const [colunas, setColunas] = useState<ColunaDTO[]>(colunasIniciais);
  const [clientes, setClientes] = useState<ClienteDTO[]>(clientesIniciais);
  const [selecao, setSelecao] = useState<Selecao>(null);
  const [busca, setBusca] = useState("");
  const [leadDragId, setLeadDragId] = useState<string | null>(null);
  const [colDragId, setColDragId] = useState<string | null>(null);
  const [criandoCategoria, setCriandoCategoria] = useState(false);
  const [nomeCategoria, setNomeCategoria] = useState("");
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const [confirmDelCategoria, setConfirmDelCategoria] = useState<string | null>(null);
  const [editandoCategoria, setEditandoCategoria] = useState<{ id: string; nome: string } | null>(null);
  // Nomes renomeados nesta sessão (otimista, até o router.refresh chegar).
  const [nomesCategoria, setNomesCategoria] = useState<Record<string, string>>({});
  const quadroRef = useRef<HTMLDivElement>(null);

  const categoriaQS = `?categoria=${categoriaAtual?.id ?? ""}`;
  const nomeDe = (cat: CategoriaDTO) => nomesCategoria[cat.id] ?? cat.nome;

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? clientes.filter((c) => c.nome.toLowerCase().includes(q)) : clientes;
  }, [clientes, busca]);

  const cardsDe = (colunaId: string) =>
    filtrados
      .filter((c) => c.colunaId === colunaId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  async function recarregar() {
    const [rc, rk] = await Promise.all([
      fetch(`/api/clientes${categoriaQS}`),
      fetch(`/api/colunas${categoriaQS}`),
    ]);
    if (rc.ok) setClientes((await rc.json()).clientes as ClienteDTO[]);
    if (rk.ok) setColunas((await rk.json()).colunas as ColunaDTO[]);
    router.refresh();
  }

  async function moverCliente(clienteId: string, colunaId: string) {
    const atual = clientes.find((c) => c.id === clienteId);
    if (!atual || atual.colunaId === colunaId) return;
    setClientes((prev) => prev.map((c) => (c.id === clienteId ? { ...c, colunaId } : c)));
    await fetch(`/api/clientes/${clienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colunaId }),
    });
    router.refresh();
  }

  async function novaColuna() {
    const res = await fetch("/api/colunas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: "Nova coluna", categoriaId: categoriaAtual?.id ?? "" }),
    });
    if (res.ok) {
      const nova = (await res.json()).coluna as ColunaDTO;
      setColunas((prev) => [...prev, nova]);
    }
  }

  async function patchColuna(id: string, data: Partial<ColunaDTO>) {
    setColunas((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    await fetch(`/api/colunas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    router.refresh();
  }

  async function excluirColuna(id: string) {
    setColunas((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/colunas/${id}`, { method: "DELETE" });
    // Os leads da coluna são realocados no servidor — recarrega o quadro.
    await recarregar();
  }

  // Reordena arrastando: move a coluna arrastada para a posição da coluna alvo.
  async function reordenarColuna(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const ord = [...colunas].sort((a, b) => a.ordem - b.ordem);
    const from = ord.findIndex((c) => c.id === draggedId);
    const to = ord.findIndex((c) => c.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ord.splice(from, 1);
    ord.splice(to, 0, moved);
    const atualizadas = ord.map((c, i) => ({ ...c, ordem: i }));
    setColunas(atualizadas);
    await Promise.all(
      atualizadas.map((c) =>
        fetch(`/api/colunas/${c.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ordem: c.ordem }),
        }),
      ),
    );
    router.refresh();
  }

  async function criarCategoria() {
    const nome = nomeCategoria.trim();
    if (!nome || salvandoCategoria) return;
    setSalvandoCategoria(true);
    try {
      const res = await fetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      if (res.ok) {
        const nova = (await res.json()).categoria as CategoriaDTO;
        setCriandoCategoria(false);
        setNomeCategoria("");
        router.push(`/fundo-de-funil?categoria=${nova.id}`);
      }
    } finally {
      setSalvandoCategoria(false);
    }
  }

  async function excluirCategoria(id: string) {
    await fetch(`/api/categorias/${id}`, { method: "DELETE" });
    setConfirmDelCategoria(null);
    if (categoriaAtual?.id === id) router.push("/fundo-de-funil");
    else router.refresh();
  }

  async function renomearCategoria() {
    const edicao = editandoCategoria;
    setEditandoCategoria(null);
    if (!edicao) return;
    const nome = edicao.nome.trim();
    const original = categorias.find((c) => c.id === edicao.id);
    if (!nome || !original || nome === nomeDe(original)) return;
    setNomesCategoria((prev) => ({ ...prev, [edicao.id]: nome }));
    await fetch(`/api/categorias/${edicao.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    router.refresh();
  }

  // Arrastar o fundo do quadro para rolar na horizontal (pan).
  function iniciarPan(e: React.MouseEvent<HTMLDivElement>) {
    const quadro = quadroRef.current;
    const alvo = e.target as HTMLElement;
    // Só quando o clique é no fundo (não em coluna, card ou botão).
    if (!quadro || (alvo !== quadro && !alvo.hasAttribute("data-pan"))) return;
    e.preventDefault();
    const inicioX = e.clientX;
    const inicioScroll = quadro.scrollLeft;
    const mover = (ev: MouseEvent) => {
      quadro.scrollLeft = inicioScroll - (ev.clientX - inicioX);
    };
    const soltar = () => {
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("mouseup", soltar);
    };
    window.addEventListener("mousemove", mover);
    window.addEventListener("mouseup", soltar);
  }

  function aoSalvar() {
    setSelecao(null);
    recarregar();
  }

  const colunasOrdenadas = [...colunas].sort((a, b) => a.ordem - b.ordem);
  const leadDrag = { id: leadDragId, set: setLeadDragId };
  const colDrag = { id: colDragId, set: setColDragId };
  const modalColunaIdInicial =
    selecao?.tipo === "novo" ? selecao.colunaId : colunasOrdenadas[0]?.id ?? null;

  const pillAtiva =
    "border-transparent bg-brand-gradient text-white shadow-brand";
  const pillInativa =
    "border-line bg-card-2 text-ink-soft hover:border-brand-400/60 hover:text-ink";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-brand-gradient p-6 text-white shadow-brand animate-rise sm:p-7">
        <div className="absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/15 blur-2xl animate-float" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-4xl">
              {categoriaAtual ? nomeDe(categoriaAtual) : "Fundo de Funil"}
            </h1>
            <p className="mt-1 text-sm text-white/85">
              Arraste leads entre colunas e arraste o cabeçalho para reordenar ·{" "}
              {clientes.length} {clientes.length === 1 ? "lead" : "leads"}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCriandoCategoria(true)}
              className="rounded-xl bg-white/20 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/30"
            >
              + Nova categoria
            </button>
            <button
              onClick={novaColuna}
              className="rounded-xl bg-white/20 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/30"
            >
              + Nova coluna
            </button>
            <button
              onClick={() => setSelecao({ tipo: "novo", colunaId: colunasOrdenadas[0]?.id ?? null })}
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand-700 shadow-lg transition hover:bg-brand-50"
            >
              + Novo lead
            </button>
          </div>
        </div>
      </section>

      {/* Busca centralizada + navegação entre categorias */}
      <div className="flex flex-col items-center gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar lead por nome…"
          className="w-full max-w-xs rounded-xl border border-line bg-card-2 px-3.5 py-2 text-center text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
        />

        {categorias.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => router.push("/fundo-de-funil")}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                categoriaAtual === null ? pillAtiva : pillInativa
              }`}
            >
              Fundo de Funil
            </button>
            {categorias.map((cat) => {
              const ativa = categoriaAtual?.id === cat.id;
              const nome = nomeDe(cat);
              if (editandoCategoria?.id === cat.id) {
                return (
                  <input
                    key={cat.id}
                    autoFocus
                    value={editandoCategoria.nome}
                    onChange={(e) => setEditandoCategoria({ id: cat.id, nome: e.target.value })}
                    onBlur={renomearCategoria}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setEditandoCategoria(null);
                    }}
                    className="w-40 rounded-full border border-brand-400 bg-card-2 px-3.5 py-1.5 text-xs font-bold text-ink outline-none ring-4 ring-brand-500/15"
                    aria-label="Renomear categoria"
                  />
                );
              }
              return (
                <div key={cat.id} className="relative">
                  <div
                    className={`group relative flex items-center overflow-hidden rounded-full border transition ${
                      ativa ? pillAtiva : pillInativa
                    }`}
                  >
                    {/* As ações expandem a largura no hover (não sobrepõem o nome). */}
                    <button
                      onClick={() => router.push(`/fundo-de-funil?categoria=${cat.id}`)}
                      className="max-w-48 truncate py-1.5 pl-3.5 pr-3.5 text-center text-xs font-bold transition-[padding] group-hover:pr-1.5"
                      title={nome}
                    >
                      {nome}
                    </button>
                    <div className="flex max-w-0 items-center gap-0.5 overflow-hidden opacity-0 transition-all duration-200 group-hover:max-w-20 group-hover:pr-1.5 group-hover:opacity-100">
                      <button
                        onClick={() => setEditandoCategoria({ id: cat.id, nome })}
                        className="shrink-0 rounded-full p-1 hover:bg-black/10"
                        title="Renomear categoria"
                        aria-label={`Renomear categoria ${nome}`}
                      >
                        <PencilIcon className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelCategoria(cat.id)}
                        className="shrink-0 rounded-full p-1 text-[10px] leading-none hover:bg-black/10"
                        title="Excluir categoria"
                        aria-label={`Excluir categoria ${nome}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {confirmDelCategoria === cat.id && (
                    <div className="absolute left-1/2 top-full z-30 mt-2 w-60 -translate-x-1/2 rounded-xl border border-line bg-card p-3 text-left shadow-xl">
                      <p className="mb-2 text-xs font-medium text-ink">
                        Excluir a categoria “{nome}”? Os leads dela voltam para o Fundo de
                        Funil, em “Sem categoria”.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => excluirCategoria(cat.id)}
                          className="flex-1 rounded-lg bg-red-500 px-2 py-1 text-xs font-bold text-white transition hover:bg-red-600"
                        >
                          Excluir
                        </button>
                        <button
                          onClick={() => setConfirmDelCategoria(null)}
                          className="flex-1 rounded-lg border border-white/10 px-2 py-1 text-xs font-semibold text-ink-soft transition hover:bg-white/5"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quadro — largura total da tela, altura limitada à janela: cada coluna
          rola por dentro e a barra horizontal fica sempre visível no rodapé.
          Rola na horizontal pela barra, Shift+roda, ou arrastando o fundo. */}
      <div
        ref={quadroRef}
        onMouseDown={iniciarPan}
        className="scroll-fino relative left-1/2 w-screen -translate-x-1/2 cursor-grab overflow-x-auto px-4 pb-2 active:cursor-grabbing sm:px-6 lg:px-8"
      >
        <div data-pan className="flex h-[max(24rem,calc(100dvh_-_26rem))] items-start gap-4">
          {colunasOrdenadas.map((col) => (
            <Coluna
              key={col.id}
              coluna={col}
              cards={cardsDe(col.id)}
              onDropCliente={moverCliente}
              onReorder={reordenarColuna}
              onOpenCard={(c) => setSelecao({ tipo: "editar", cliente: c })}
              onNovo={() => setSelecao({ tipo: "novo", colunaId: col.id })}
              onRename={(titulo) => patchColuna(col.id, { titulo })}
              onRecolor={(cor) => patchColuna(col.id, { cor })}
              onDelete={() => excluirColuna(col.id)}
              leadDrag={leadDrag}
              colDrag={colDrag}
            />
          ))}

          <button
            onClick={novaColuna}
            className="h-40 w-56 shrink-0 rounded-2xl border-2 border-dashed border-brand-500/30 text-sm font-semibold text-brand-400 transition hover:bg-brand-500/10"
          >
            + Nova coluna
          </button>
        </div>
      </div>

      {selecao && (
        <ClienteModal
          cliente={selecao.tipo === "editar" ? selecao.cliente : null}
          colunas={colunasOrdenadas}
          colunaIdInicial={modalColunaIdInicial}
          onClose={() => setSelecao(null)}
          onSaved={aoSalvar}
          onDeleted={aoSalvar}
        />
      )}

      {criandoCategoria && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onMouseDown={() => setCriandoCategoria(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-card p-6 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl font-bold text-ink">Nova categoria</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Cria um quadro idêntico ao Fundo de Funil, direcionado para outro tipo de lead.
            </p>
            <input
              autoFocus
              value={nomeCategoria}
              onChange={(e) => setNomeCategoria(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") criarCategoria();
                if (e.key === "Escape") setCriandoCategoria(false);
              }}
              placeholder="Nome da categoria…"
              className="mt-4 w-full rounded-xl border border-line bg-card-2 px-3.5 py-2 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setCriandoCategoria(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={criarCategoria}
                disabled={salvandoCategoria || !nomeCategoria.trim()}
                className="rounded-xl bg-brand-gradient px-5 py-2 text-sm font-semibold text-white shadow-brand transition hover:brightness-105 disabled:opacity-60"
              >
                {salvandoCategoria ? "Criando…" : "Criar categoria"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
