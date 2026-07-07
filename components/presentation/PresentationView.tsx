"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PresentationData } from "@/lib/presentation";
import DashScene from "@/components/presentation/DashScene";

const FP = "var(--font-poppins), sans-serif";
const FD = "var(--font-dm-sans), sans-serif";

const pad = (n: number) => String(n).padStart(2, "0");

/* ── Ritmo do palco ────────────────────────────────────────────────────────
   T = transição, D = pausa (dwell), U = passo por cena — em frações de vh.
   As fases derivam do scroll SUAVIZADO (inércia) → fluido e simétrico;
   parado numa cena, o suavizado converge e os valores travam no final.   */
const T_R = 0.9;
const D_R = 0.55;
const U_R = T_R + D_R; // 1.45

type Phase = "hold" | "exit" | "enter" | "off";

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const eo = (t: number) => {
  t = clamp01(t);
  return 1 - Math.pow(1 - t, 3);
};
const eb = (t: number) => {
  t = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
// rotação pseudo-aleatória determinística por índice de letra
const rotSeed = (j: number) => (((j * 137) % 11) - 5) * 0.9;

const RING_TRACK = "rgba(255,210,170,.14)";

type CountRef = { el: HTMLElement; t: number; suf: string; idx: number };
type BarRef = { el: HTMLElement; pct: number; idx: number };
type RingRef = { el: HTMLElement; pct: number };
type CascadeRef = { el: HTMLElement; idx: number };
type MarqRef = { el: HTMLElement; sp: number };

type SceneRefs = {
  media: HTMLElement | null;
  img: HTMLElement | null;
  shine: HTMLElement | null;
  ghost: HTMLElement | null;
  bignum: HTMLElement | null;
  name: HTMLElement | null;
  letters: HTMLElement[];
  subs: HTMLElement[];
  isubs: HTMLElement[];
  marqs: MarqRef[];
  core: HTMLElement | null;
  panel: HTMLElement | null;
  bgphoto: HTMLElement | null;
  ghostNum: HTMLElement | null;
  cascades: CascadeRef[];
  counts: CountRef[];
  bars: BarRef[];
  rings: RingRef[];
};

function buildRefs(el: HTMLElement): SceneRefs {
  const q = (sel: string) => el.querySelector<HTMLElement>(sel);
  const qa = (sel: string) => Array.from(el.querySelectorAll<HTMLElement>(sel));
  return {
    media: q("[data-media]"),
    img: q("[data-img]"),
    shine: q("[data-shine]"),
    ghost: q("[data-ghost]"),
    bignum: q("[data-bignum]"),
    name: q("[data-name-block]"),
    letters: qa("[data-letter]"),
    subs: qa("[data-sub]"),
    isubs: qa("[data-isub]"),
    marqs: qa("[data-marq]").map((n) => ({
      el: n,
      sp: parseFloat(n.getAttribute("data-marq") || "0") || 0,
    })),
    core: q("[data-core]"),
    panel: q("[data-panel]"),
    bgphoto: q("[data-bgphoto]"),
    ghostNum: q("[data-ghost-num]"),
    cascades: qa("[data-cascade],[data-dcascade]").map((n) => ({
      el: n,
      idx:
        parseInt(n.getAttribute("data-cascade") ?? n.getAttribute("data-dcascade") ?? "0", 10) ||
        0,
    })),
    counts: qa("[data-count]").map((n) => ({
      el: n,
      t: parseFloat(n.getAttribute("data-target") || "0") || 0,
      suf: n.getAttribute("data-suffix") || "",
      idx: n.hasAttribute("data-cidx") ? parseInt(n.getAttribute("data-cidx") || "0", 10) || 0 : -1,
    })),
    bars: qa("[data-fill-bar]").map((n) => ({
      el: n,
      pct: parseFloat(n.getAttribute("data-pct") || "0") || 0,
      idx: n.hasAttribute("data-cidx") ? parseInt(n.getAttribute("data-cidx") || "0", 10) || 0 : -1,
    })),
    rings: qa("[data-ring]").map((n) => ({
      el: n,
      pct: parseFloat(n.getAttribute("data-pct") || "0") || 0,
    })),
  };
}

/** Números/barras/anéis: `nv=1` no hold → sempre travados no valor final. */
function setFill(r: SceneRefs, nv: number, up: boolean) {
  const base = up ? nv : nv > 0.001 ? 1 : 0;
  for (const c of r.counts) {
    const eff = c.idx < 0 ? base : up ? clamp01(base * 1.5 - c.idx * 0.1) : base;
    c.el.textContent = Math.round(c.t * eff) + c.suf;
  }
  for (const b of r.bars) {
    const eff = b.idx < 0 ? base : up ? clamp01(base * 1.45 - b.idx * 0.15) : base;
    b.el.style.width = b.pct * eff + "%";
  }
  for (const g of r.rings) {
    g.el.style.background = `conic-gradient(#F26421 ${g.pct * base}%, ${RING_TRACK} 0)`;
  }
}

function applyScene(
  el: HTMLElement,
  r: SceneRefs,
  type: string,
  phase: Phase,
  f: number,
  l: number, // progresso contínuo pela cena inteira (enter→hold→exit)
  ss: number, // scroll suavizado global (marquees / drifts)
  m: number,
  up: boolean,
): number {
  if (phase === "off") {
    el.style.opacity = "0";
    el.style.visibility = "hidden";
    el.style.pointerEvents = "none";
    if (type === "data" || type === "dash") setFill(r, 0, up);
    return 0;
  }
  el.style.visibility = "visible";
  el.style.pointerEvents = phase === "hold" ? "auto" : "none";

  const e = eo(f);
  let op = 1;

  /* ── Intro: tipografia cinética + marquees + núcleo de luz ── */
  if (type === "title") {
    if (phase === "hold") {
      op = 1;
      el.style.transform = "none";
    } else if (phase === "exit") {
      op = 1 - e;
      el.style.transform = `translateY(${-f * 60 * m}px)`;
    } else {
      op = e;
      el.style.transform = `translateY(${(1 - e) * 40 * m}px)`;
    }
    el.style.opacity = String(op);

    for (const mq of r.marqs)
      mq.el.style.transform = `translate3d(${-360 + ss * mq.sp * m}px,0,0)`;
    if (r.core) {
      r.core.style.transform = `translate(-50%,-50%) scale(${1 + l * 0.7})`;
      r.core.style.opacity = String(0.85 * (phase === "exit" ? 1 - e : 1));
    }
    r.isubs.forEach((sub, i) => {
      if (phase === "hold") {
        sub.style.transform = "none";
        sub.style.opacity = "1";
      } else if (phase === "enter") {
        sub.style.transform = `translateY(${(1 - e) * (30 + i * 16) * m}px)`;
        sub.style.opacity = String(clamp01(e * 1.5 - i * 0.12));
      } else {
        sub.style.transform = `translateY(${-f * (i * 22) * m}px) rotate(${-f * (i - 1.5) * 0.7 * m}deg)`;
        sub.style.opacity = "1";
      }
    });
    // letras de "reativado." — sobem mascaradas / escapam escalonadas
    const ln = Math.max(1, r.letters.length - 1);
    const lstep = 0.6 / ln;
    r.letters.forEach((lt, j) => {
      if (phase === "hold") {
        lt.style.transform = "none";
      } else if (phase === "enter") {
        const fi = eo(clamp01(f * 1.6 - j * lstep));
        lt.style.transform = `translateY(${(1 - fi) * 115 * m}%) rotate(${(1 - fi) * rotSeed(j) * m}deg)`;
      } else {
        const fj = eo(clamp01(f * 1.6 - j * lstep));
        lt.style.transform = `translateY(${-fj * 120 * m}%) rotate(${-fj * rotSeed(j) * m}deg)`;
      }
    });
    return op;
  }

  /* ── Hero: portal abre a foto em tela cheia + nome letra a letra ── */
  if (type === "hero") {
    let nt = 0;
    if (phase === "hold") {
      op = 1;
      if (r.media) {
        r.media.style.clipPath = "inset(0% 0% round 0px)";
        r.media.style.transform = "none";
        r.media.style.filter = "none";
      }
    } else if (phase === "enter") {
      op = Math.min(1, f * 1.3);
      nt = (1 - e) * 90 * m;
      if (r.media) {
        const a = (1 - e) * m;
        r.media.style.clipPath = `inset(${a * 24}% ${a * 32}% round ${a * 56}px)`;
        r.media.style.transform = "none";
        r.media.style.filter = "none";
      }
    } else {
      op = 1 - e;
      nt = -f * 130 * m;
      if (r.media) {
        r.media.style.clipPath = "inset(0% 0% round 0px)";
        r.media.style.transform = `translateY(${-f * 160 * m}px) scale(${1 + f * 0.2})`;
        r.media.style.filter = `brightness(${1 - f * 0.5}) blur(${f * 5 * m}px)`;
      }
    }
    el.style.opacity = String(op);
    // Ken Burns contínuo dentro do portal (ampliação mínima p/ preservar nitidez)
    if (r.img)
      r.img.style.transform = `scale(${1.1 - eo(l) * 0.07}) translate3d(0, ${(l - 0.5) * 16 * m}px, 0)`;
    if (r.shine) {
      const prog = phase === "enter" ? f * 0.5 : phase === "exit" ? 0.5 + f * 0.5 : 0.5;
      r.shine.style.transform = `translateX(${-180 + prog * 680}%)`;
      r.shine.style.opacity = String(phase === "hold" ? 0 : Math.sin(Math.PI * f) * 0.5 * m);
    }
    if (r.ghost) {
      const gy =
        (l - 0.5) * 44 * m +
        (phase === "enter" ? (1 - e) * 150 * m : phase === "exit" ? -f * 240 * m : 0);
      r.ghost.style.transform = `translate3d(0, ${gy}px, 0)`;
      r.ghost.style.opacity = String((phase === "enter" ? e : phase === "exit" ? 1 - e : 1) * 0.14);
    }
    if (r.bignum) {
      r.bignum.style.transform = `translate3d(0, ${(0.5 - l) * 120 * m}px, 0)`;
      r.bignum.style.opacity = String(phase === "enter" ? e : phase === "exit" ? 1 - e : 1);
    }
    if (r.name) r.name.style.transform = `translateY(${nt}px)`;
    // letras do nome — máscara de linha, stagger + rotação
    const ln = Math.max(1, r.letters.length - 1);
    const lstep = 0.6 / ln;
    r.letters.forEach((lt, j) => {
      if (phase === "hold") {
        lt.style.transform = "none";
      } else if (phase === "enter") {
        const fi = eo(clamp01(f * 1.6 - j * lstep));
        lt.style.transform = `translateY(${(1 - fi) * 112 * m}%) rotate(${(1 - fi) * rotSeed(j) * m}deg)`;
      } else {
        const fj = eo(clamp01(f * 1.6 - j * lstep));
        lt.style.transform = `translateY(${-fj * 125 * m}%) rotate(${-fj * rotSeed(j) * 0.7 * m}deg)`;
      }
    });
    r.subs.forEach((sub, i) => {
      if (phase === "hold") {
        sub.style.transform = "none";
        sub.style.opacity = "1";
      } else if (phase === "enter") {
        sub.style.transform = `translateY(${(1 - e) * (24 + i * 30) * m}px)`;
        sub.style.opacity = String(clamp01(e * 1.35 - i * 0.14));
      } else {
        sub.style.transform = `translateY(${-f * i * 30 * m}px)`;
        sub.style.opacity = "1";
      }
    });
    return op;
  }

  /* ── Data / Dash: teatro de estatísticas ── */
  let pt: string, blur: number, nv: number;
  if (phase === "hold") {
    op = 1;
    pt = "translateY(0) scale(1)";
    blur = 0;
    nv = 1;
  } else if (phase === "exit") {
    op = 1 - e;
    pt = `translateY(${-f * 90 * m}px) scale(${1 - f * 0.05}) rotateX(${-f * 3 * m}deg)`;
    blur = f * 6;
    nv = 1;
  } else {
    op = Math.min(1, f * 1.25);
    pt = `translateY(${(1 - eb(f)) * 90 * m}px) scale(${0.92 + 0.08 * eb(f)}) rotateX(${(1 - eb(f)) * 6 * m}deg)`;
    blur = (1 - e) * 6;
    nv = e;
  }
  el.style.opacity = String(op);
  if (r.panel) {
    r.panel.style.transform = pt;
    r.panel.style.filter = `blur(${blur * m}px)`;
  }
  if (r.bgphoto)
    r.bgphoto.style.transform = `translate3d(0, ${(0.5 - l) * 44 * m}px, 0) scale(1.07)`;
  if (r.ghostNum) {
    const gy =
      (0.5 - l) * 90 * m +
      (phase === "enter" ? (1 - eb(f)) * 110 * m : phase === "exit" ? -f * 140 * m : 0);
    r.ghostNum.style.transform = `translate3d(0, ${gy}px, 0)`;
    r.ghostNum.style.opacity = String(
      phase === "enter" ? Math.min(1, f * 1.25) : 1 - (phase === "exit" ? e : 0),
    );
  }
  const step = type === "dash" ? 0.06 : 0.05;
  const scale = type === "dash" ? 1.45 : 1.4;
  const amp = type === "dash" ? 56 : 48;
  for (const c of r.cascades) {
    if (phase === "hold") {
      c.el.style.transform = "none";
      c.el.style.opacity = "1";
    } else if (phase === "enter") {
      const fi = clamp01(f * scale - c.idx * step);
      c.el.style.transform = `translateY(${(1 - eb(fi)) * amp * m}px)`;
      c.el.style.opacity = String(Math.min(1, fi * 1.3));
    } else {
      c.el.style.transform = `translateY(${-f * c.idx * 5 * m}px)`;
      c.el.style.opacity = "1";
    }
  }
  setFill(r, nv, up);
  return op;
}

/* ── Camadas de fundo ─────────────────────────────────────────────────── */
const ORBS = [
  { top: "6%", left: "4%", size: 420, c: "rgba(242,100,33,.20)", amp: 40, ph: 0.0, dx: -1 },
  { top: "16%", left: "76%", size: 300, c: "rgba(224,67,12,.18)", amp: 58, ph: 1.7, dx: 1 },
  { top: "56%", left: "10%", size: 260, c: "rgba(245,132,50,.15)", amp: 70, ph: 3.1, dx: 1 },
  { top: "62%", left: "68%", size: 440, c: "rgba(242,100,33,.13)", amp: 30, ph: 4.4, dx: -1 },
  { top: "34%", left: "42%", size: 200, c: "rgba(224,67,12,.12)", amp: 82, ph: 5.6, dx: 1 },
  { top: "80%", left: "36%", size: 340, c: "rgba(245,132,50,.14)", amp: 48, ph: 2.4, dx: -1 },
];

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const MARQ_TEXT = "REATIVADO ✦ FUNDO DE FUNIL ✦ MEEVENTOS ✦ RECUPERAÇÃO ✦ ";

/* ── View ──────────────────────────────────────────────────────────────── */
export default function PresentationView({
  data,
  onExit,
}: {
  data: PresentationData;
  onExit: () => void;
}) {
  const [reduced, setReduced] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const wm1Ref = useRef<HTMLDivElement>(null);
  const wm2Ref = useRef<HTMLDivElement>(null);
  const wavesARef = useRef<SVGSVGElement>(null);
  const wavesBRef = useRef<SVGSVGElement>(null);
  const orbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const N = data.closers.length;
  const S = 2 + 2 * N;
  const dashK = 2 * N + 1;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  // Motor: inércia (lerp) + fases + fundo + velocity skew.
  useEffect(() => {
    const sc = scrollRef.current;
    const stage = stageRef.current;
    if (!sc || !stage) return;

    const m = reduced ? 0 : 1;
    const up = !reduced;

    const sceneEls = Array.from(stage.querySelectorAll<HTMLElement>("[data-scene]"));
    const refsCache = new WeakMap<HTMLElement, SceneRefs>();
    const phaseCache = new WeakMap<HTMLElement, Phase>();
    const refsOf = (el: HTMLElement) => {
      let r = refsCache.get(el);
      if (!r) {
        r = buildRefs(el);
        refsCache.set(el, r);
      }
      return r;
    };

    const dotForScene = (k: number) => (k <= 0 ? 0 : k >= dashK ? N + 1 : Math.floor((k - 1) / 2) + 1);

    let ss = sc.scrollTop; // scroll suavizado — dirige TUDO
    let prevSS = ss;
    let idle = 0;
    let running = false;
    let rafId = 0;
    let lastDot = -1;

    const updateScenes = (vh: number) => {
      const T = vh * T_R;
      const D = vh * D_R;
      const U = T + D;

      let heroOp = 0;
      let panelOp = 0;
      for (const el of sceneEls) {
        const k = parseInt(el.dataset.scene || "0", 10) || 0;
        const type = el.dataset.type || "";
        const Pk = k * U;
        let phase: Phase = "off";
        let f = 0;
        if (ss >= Pk && ss <= Pk + D) phase = "hold";
        else if (ss > Pk + D && ss < Pk + D + T) {
          phase = "exit";
          f = (ss - (Pk + D)) / T;
        } else if (ss >= Pk - T && ss < Pk) {
          phase = "enter";
          f = (ss - (Pk - T)) / T;
        }
        if (phase === "off" && phaseCache.get(el) === "off") continue;
        const l = clamp01((ss - (Pk - T)) / (2 * T + D));
        const op = applyScene(el, refsOf(el), type, phase, f, l, ss, m, up);
        phaseCache.set(el, phase);
        if (type === "hero") heroOp = Math.max(heroOp, op);
        else if (type === "data" || type === "dash") panelOp = Math.max(panelOp, op);
      }
      const dim = 1 - 0.34 * panelOp - 0.2 * heroOp;
      if (dimRef.current) dimRef.current.style.opacity = String(Math.max(0.4, dim));

      const Plast = (S - 1) * U;
      const sp = clamp01(ss / (Plast + D));
      if (progressRef.current) progressRef.current.style.width = sp * 100 + "%";
      const kNear = Math.min(S - 1, Math.max(0, Math.round(ss / U)));
      const cnt = `${pad(kNear + 1)} / ${pad(S)}`;
      if (counterRef.current && counterRef.current.textContent !== cnt)
        counterRef.current.textContent = cnt;
      const dot = dotForScene(kNear);
      if (dot !== lastDot) {
        lastDot = dot;
        dotRefs.current.forEach((d, i) => {
          if (d) d.dataset.active = i === dot ? "1" : "0";
        });
      }
    };

    const applyBackdrop = () => {
      if (wm1Ref.current)
        wm1Ref.current.style.transform = `translate3d(${-ss * 0.014 * m}px, ${ss * 0.028 * m}px, 0) rotate(${ss * 0.0005 * m}deg)`;
      if (wm2Ref.current)
        wm2Ref.current.style.transform = `translate3d(${ss * 0.016 * m}px, ${-ss * 0.024 * m}px, 0) rotate(${-ss * 0.0005 * m}deg)`;
      if (wavesARef.current)
        wavesARef.current.style.transform = `translate3d(${-ss * 0.035 * m}px, ${ss * 0.012 * m}px, 0)`;
      if (wavesBRef.current)
        wavesBRef.current.style.transform = `translate3d(${ss * 0.028 * m}px, ${-ss * 0.01 * m}px, 0)`;
      orbRefs.current.forEach((orb, i) => {
        if (!orb) return;
        const o = ORBS[i];
        const ty = Math.sin(ss * 0.00085 + o.ph) * o.amp * m;
        const tx = Math.cos(ss * 0.0006 + o.ph * 1.3) * o.amp * 0.55 * m * o.dx;
        orb.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      });
    };

    const frame = () => {
      const vh = sc.clientHeight;
      const s = sc.scrollTop;
      if (reduced) ss = s;
      else ss += (s - ss) * 0.095; // inércia
      const settled = Math.abs(s - ss) < 0.1;
      if (settled) ss = s;

      const v = ss - prevSS; // velocidade → skew do mundo
      prevSS = ss;
      if (worldRef.current) {
        const sk = Math.max(-1.6, Math.min(1.6, v * 0.02)) * m;
        const zc = 1 - Math.min(Math.abs(v) * 0.00012, 0.02) * m;
        worldRef.current.style.transform = `skewY(${sk}deg) scale(${zc})`;
      }

      updateScenes(vh);
      applyBackdrop();

      idle = settled && Math.abs(v) < 0.05 ? idle + 1 : 0;
      if (idle > 12) {
        running = false;
        return;
      }
      rafId = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!running) {
        running = true;
        idle = 0;
        rafId = requestAnimationFrame(frame);
      }
    };
    const onResize = () => kick();

    const onKeyNav = (ev: KeyboardEvent) => {
      const keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"];
      if (!keys.includes(ev.key)) return;
      ev.preventDefault();
      const U = sc.clientHeight * U_R;
      const kNear = Math.min(S - 1, Math.max(0, Math.round(sc.scrollTop / U)));
      let target = kNear;
      if (ev.key === "ArrowDown" || ev.key === "PageDown") target = kNear + 1;
      else if (ev.key === "ArrowUp" || ev.key === "PageUp") target = kNear - 1;
      else if (ev.key === "Home") target = 0;
      else target = S - 1;
      target = Math.min(S - 1, Math.max(0, target));
      sc.scrollTo({ top: target * U }); // a inércia faz o glide
      kick();
    };

    sc.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyNav);
    kick();
    const t = window.setTimeout(kick, 400);
    return () => {
      sc.removeEventListener("scroll", kick);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyNav);
      cancelAnimationFrame(rafId);
      running = false;
      clearTimeout(t);
    };
  }, [reduced, data, N, S, dashK]);

  const trackHeight = `${(S - 1) * U_R * 100 + 160}vh`;
  const tickDenom = S - 1 + D_R / U_R;
  const scrollToScene = (k: number) => {
    const sc = scrollRef.current;
    if (!sc) return;
    sc.scrollTo({ top: k * sc.clientHeight * U_R });
  };
  const dots: { label: string; k: number }[] = [
    { label: "Início", k: 0 },
    ...data.closers.map((c, i) => ({ label: c.name, k: 1 + 2 * i })),
    { label: "Dashboard", k: dashK },
  ];

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Apresentação de performance dos closers"
      ref={scrollRef}
      className="pvScroll"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        overflowY: "auto",
        overflowX: "hidden",
        background: "#171210",
        color: "#F3E7DC",
        fontFamily: FD,
      }}
    >
      {/* Barra de progresso + ticks */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          zIndex: 120,
          background: "rgba(255,180,120,.1)",
        }}
      >
        {Array.from({ length: S }, (_, k) => (
          <span
            key={k}
            style={{
              position: "absolute",
              top: 0,
              left: `${(k / tickDenom) * 100}%`,
              width: 2,
              height: "100%",
              background: "rgba(255,180,120,.28)",
            }}
          />
        ))}
        <div
          ref={progressRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: "0%",
            background: "linear-gradient(90deg,#F58432,#E0430C)",
            boxShadow: "0 0 14px rgba(242,100,33,.8)",
          }}
        />
      </div>

      {/* Header */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 110,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "12px clamp(14px, 4vw, 30px)",
          background: "rgba(18,13,10,.72)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(255,180,120,.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "linear-gradient(135deg,#F58432,#E0430C)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 18px rgba(242,100,33,.45)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/capelo.png"
              alt="meeventos"
              style={{ width: 22, height: 22, objectFit: "contain", filter: "brightness(0) invert(1)" }}
            />
          </div>
          <span style={{ font: `700 clamp(15px, 4.4vw, 18px) ${FP}`, letterSpacing: "-.01em" }}>
            <span style={{ color: "#F3E7DC" }}>mee</span>
            <span style={{ color: "#F26421" }}>ventos</span>
          </span>
          <span
            ref={counterRef}
            style={{
              marginLeft: 4,
              font: `600 11px ${FD}`,
              color: "#8d7a6c",
              letterSpacing: ".1em",
              whiteSpace: "nowrap",
            }}
          >
            {pad(1)} / {pad(S)}
          </span>
        </div>
        <button
          onClick={onExit}
          aria-label="Sair da apresentação"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            flexShrink: 0,
            border: "1px solid rgba(245,132,50,.4)",
            background: "rgba(34,25,19,.6)",
            color: "#F58432",
            cursor: "pointer",
            font: `600 12px ${FD}`,
            padding: "6px 12px",
            borderRadius: 20,
            whiteSpace: "nowrap",
          }}
        >
          ✕ Sair
        </button>
      </header>

      {/* Dots de navegação */}
      <nav
        aria-label="Cenas da apresentação"
        className="pvDots"
        style={{
          position: "fixed",
          right: 22,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 115,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {dots.map((d, i) => (
          <span key={d.k} className="pvDotWrap">
            <span className="pvDotLabel">{d.label}</span>
            <button
              ref={(n) => {
                dotRefs.current[i] = n;
              }}
              className="pvDot"
              data-active={i === 0 ? "1" : "0"}
              aria-label={d.label}
              onClick={() => scrollToScene(d.k)}
            />
          </span>
        ))}
      </nav>

      {/* Trilho alto → scroll */}
      <div style={{ position: "relative", width: "100%", height: trackHeight }}>
        <div
          ref={stageRef}
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            overflow: "hidden",
            background: "#171210",
          }}
        >
          {/* Fundo multi-camadas */}
          <div aria-hidden style={{ position: "absolute", inset: 0 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(58% 50% at 18% 14%,rgba(242,100,33,.20),transparent 66%),radial-gradient(52% 52% at 86% 84%,rgba(224,67,12,.18),transparent 70%),#171210",
              }}
            />
            <div ref={dimRef} style={{ position: "absolute", inset: 0 }}>
              {/* ondas orgânicas (linguagem de curvas do site da mee) */}
              <svg
                ref={wavesARef}
                viewBox="0 0 1600 900"
                preserveAspectRatio="none"
                style={{
                  position: "absolute",
                  left: "-35%",
                  top: "-5%",
                  width: "170%",
                  height: "110%",
                  willChange: "transform",
                }}
              >
                <path
                  d="M-100,220 C260,140 520,300 880,230 S1420,90 1750,190"
                  fill="none"
                  stroke="rgba(242,100,33,.11)"
                  strokeWidth="2"
                />
                <path
                  d="M-100,520 C300,430 640,610 1000,520 S1500,380 1750,470"
                  fill="none"
                  stroke="rgba(242,100,33,.09)"
                  strokeWidth="2"
                />
                <path
                  d="M-100,760 C260,690 560,830 920,750 S1460,640 1750,720"
                  fill="none"
                  stroke="rgba(242,100,33,.1)"
                  strokeWidth="2"
                />
              </svg>
              <svg
                ref={wavesBRef}
                viewBox="0 0 1600 900"
                preserveAspectRatio="none"
                style={{
                  position: "absolute",
                  left: "-35%",
                  top: "-5%",
                  width: "170%",
                  height: "110%",
                  willChange: "transform",
                }}
              >
                <path
                  d="M-100,120 C300,60 600,200 960,140 S1480,40 1750,120"
                  fill="none"
                  stroke="rgba(245,132,50,.07)"
                  strokeWidth="1.5"
                />
                <path
                  d="M-100,400 C280,320 620,470 980,390 S1500,270 1750,350"
                  fill="none"
                  stroke="rgba(245,132,50,.06)"
                  strokeWidth="1.5"
                />
                <path
                  d="M-100,650 C320,570 640,720 1000,640 S1520,540 1750,620"
                  fill="none"
                  stroke="rgba(245,132,50,.07)"
                  strokeWidth="1.5"
                />
                <path
                  d="M-100,900 L-100,830 C400,770 900,885 1750,810 L1750,900 Z"
                  fill="rgba(242,100,33,.05)"
                />
              </svg>
              {ORBS.map((o, i) => (
                <div
                  key={i}
                  ref={(n) => {
                    orbRefs.current[i] = n;
                  }}
                  style={{
                    position: "absolute",
                    top: o.top,
                    left: o.left,
                    width: o.size,
                    height: o.size,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${o.c} 0%, transparent 68%)`,
                    willChange: "transform",
                  }}
                />
              ))}
              <div
                ref={wm1Ref}
                style={{
                  position: "absolute",
                  top: "6%",
                  left: "-5%",
                  font: `800 clamp(140px,21vw,330px) ${FP}`,
                  color: "rgba(242,100,33,.07)",
                  whiteSpace: "nowrap",
                  letterSpacing: "-.05em",
                  lineHeight: 1,
                  willChange: "transform",
                }}
              >
                meeventos
              </div>
              <div
                ref={wm2Ref}
                style={{
                  position: "absolute",
                  bottom: "4%",
                  right: "-7%",
                  font: `800 clamp(140px,21vw,330px) ${FP}`,
                  color: "rgba(224,67,12,.06)",
                  whiteSpace: "nowrap",
                  letterSpacing: "-.05em",
                  lineHeight: 1,
                  willChange: "transform",
                }}
              >
                meeventos
              </div>
            </div>
          </div>

          {/* Mundo (recebe o velocity skew) */}
          <div ref={worldRef} style={{ position: "absolute", inset: 0, willChange: "transform" }}>
            {/* SCENE 0 · intro */}
            <div
              data-scene="0"
              data-type="title"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 1,
                pointerEvents: "none",
              }}
            >
              {/* núcleo de luz */}
              <div
                data-core
                aria-hidden
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: "56vw",
                  height: "56vw",
                  transform: "translate(-50%,-50%)",
                  background:
                    "radial-gradient(circle, rgba(242,100,33,.28) 0%, rgba(224,67,12,.12) 38%, transparent 66%)",
                  willChange: "transform",
                }}
              />
              {/* marquees cinéticos */}
              {[
                { top: "9%", sp: 0.38 },
                { top: "78%", sp: -0.3 },
              ].map((mq, i) => (
                <div
                  key={i}
                  data-marq={mq.sp}
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: mq.top,
                    left: 0,
                    whiteSpace: "nowrap",
                    font: `800 7vw ${FP}`,
                    letterSpacing: "-.02em",
                    lineHeight: 1,
                    color: "transparent",
                    WebkitTextStroke: "1.5px rgba(242,100,33,.22)",
                    willChange: "transform",
                  }}
                >
                  {MARQ_TEXT.repeat(6)}
                </div>
              ))}
              <div style={{ position: "relative", textAlign: "center", padding: "0 24px", maxWidth: 1100 }}>
                <div
                  data-isub="0"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 18px",
                    borderRadius: 999,
                    border: "1px solid rgba(245,132,50,.35)",
                    background: "rgba(242,100,33,.08)",
                    font: `600 12px ${FD}`,
                    letterSpacing: ".34em",
                    color: "#F58432",
                    marginBottom: 30,
                  }}
                >
                  MEEVENTOS · RECUPERAÇÃO DE FUNDO DE FUNIL
                </div>
                <h1
                  style={{
                    font: `800 clamp(54px,8vw,124px)/0.92 ${FP}`,
                    margin: 0,
                    letterSpacing: "-.03em",
                    color: "#F3E7DC",
                    // drop-shadow (e não text-shadow): aplicado após o clip dos
                    // wrappers das letras — sombra não vira retângulo.
                    filter: "drop-shadow(0 10px 30px rgba(0,0,0,.5))",
                  }}
                >
                  <span data-isub="1" style={{ display: "block" }}>
                    Fundo de funil,
                  </span>
                  <span
                    data-isub="2"
                    aria-label="reativado."
                    // glow no bloco (pós-clip), não por letra: evita a faixa
                    // retangular do drop-shadow cortado pelos wrappers.
                    style={{ display: "block", filter: "drop-shadow(0 0 26px rgba(242,100,33,.45))" }}
                  >
                    {"reativado.".split("").map((ch, j) => (
                      <span
                        key={j}
                        aria-hidden
                        style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}
                      >
                        <span
                          data-letter={j}
                          style={{
                            display: "inline-block",
                            willChange: "transform",
                            background: "linear-gradient(135deg,#FFB27A 0%,#F26421 46%,#E0430C 100%)",
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            color: "transparent",
                          }}
                        >
                          {ch}
                        </span>
                      </span>
                    ))}
                  </span>
                </h1>
                <p
                  data-isub="3"
                  style={{
                    font: `400 clamp(16px,1.5vw,21px)/1.6 ${FD}`,
                    color: "#b6a596",
                    margin: "30px auto 0",
                    maxWidth: 620,
                  }}
                >
                  Cada closer. Cada lead recuperado. Role para mergulhar no desempenho da equipe,
                  um por um.
                </p>
                <div
                  data-isub="4"
                  style={{
                    marginTop: 60,
                    display: "inline-flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    color: "#8d7a6c",
                  }}
                >
                  <span style={{ font: `600 11px ${FD}`, letterSpacing: ".3em" }}>ROLE PARA COMEÇAR</span>
                  <span
                    aria-hidden
                    style={{
                      width: 1,
                      height: 46,
                      background: "linear-gradient(180deg,#F26421,transparent)",
                      transformOrigin: "top",
                      animation: "pvLine 1.8s ease-in-out infinite",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Cenas por closer */}
            {data.closers.map((c, i) => {
              const nome = c.name.toUpperCase();
              const fsVw = Math.min(14, 90 / (0.66 * Math.max(1, nome.length)));
              return (
                <div key={c.id}>
                  {/* hero — portal em tela cheia */}
                  <div
                    data-scene={1 + 2 * i}
                    data-type="hero"
                    style={{ position: "absolute", inset: 0, opacity: 0, pointerEvents: "none" }}
                  >
                    <div
                      data-media
                      style={{
                        position: "absolute",
                        inset: 0,
                        overflow: "hidden",
                        willChange: "transform,filter,clip-path",
                        clipPath: "inset(24% 32% round 56px)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        data-img
                        src={c.photoUrl}
                        alt={c.fullName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center 18%",
                          willChange: "transform",
                          // grade cinematográfica — dá corpo a fotos de baixa resolução
                          filter: "contrast(1.07) saturate(1.1)",
                        }}
                      />
                      {/* nome-fantasma outline */}
                      <div
                        data-ghost
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: "3%",
                          top: "12%",
                          font: `800 clamp(120px,17vw,300px) ${FP}`,
                          letterSpacing: "-.045em",
                          lineHeight: 1,
                          color: "transparent",
                          WebkitTextStroke: "2px rgba(255,255,255,.5)",
                          opacity: 0,
                          whiteSpace: "nowrap",
                          pointerEvents: "none",
                        }}
                      >
                        {nome}
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(180deg,rgba(23,18,16,.42) 0%,rgba(23,18,16,0) 30%,rgba(23,18,16,.25) 60%,rgba(23,18,16,.92) 100%)",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(105deg,rgba(224,67,12,.4),transparent 55%)",
                          mixBlendMode: "multiply",
                        }}
                      />
                      <div
                        data-shine
                        aria-hidden
                        style={{
                          position: "absolute",
                          top: "-40%",
                          bottom: "-40%",
                          left: 0,
                          width: "34%",
                          background:
                            "linear-gradient(100deg,transparent,rgba(255,214,180,.5),transparent)",
                          opacity: 0,
                          transform: "translateX(-180%)",
                          pointerEvents: "none",
                          mixBlendMode: "soft-light",
                        }}
                      />
                      {/* grain local — disfarça a suavidade de fotos ampliadas */}
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          inset: 0,
                          backgroundImage: GRAIN,
                          opacity: 0.09,
                          mixBlendMode: "overlay",
                          pointerEvents: "none",
                        }}
                      />
                    </div>

                    {/* índice gigante vertical */}
                    <div
                      data-bignum
                      aria-hidden
                      style={{
                        position: "absolute",
                        right: "3vw",
                        top: "8vh",
                        font: `800 clamp(120px,15vw,260px) ${FP}`,
                        lineHeight: 1,
                        letterSpacing: "-.05em",
                        color: "transparent",
                        WebkitTextStroke: "2px rgba(245,132,50,.4)",
                        opacity: 0,
                        pointerEvents: "none",
                        willChange: "transform",
                        textShadow: "0 0 60px rgba(242,100,33,.2)",
                      }}
                    >
                      {pad(i + 1)}
                    </div>

                    {/* bloco do nome */}
                    <div
                      data-name-block
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: "9vh",
                        padding: "0 6vw",
                        willChange: "transform",
                      }}
                    >
                      <div data-sub="0" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                        <span
                          style={{
                            padding: "7px 16px",
                            borderRadius: 999,
                            background: "rgba(23,18,16,.5)",
                            backdropFilter: "blur(8px)",
                            border: "1px solid rgba(245,132,50,.45)",
                            font: `600 12px ${FD}`,
                            letterSpacing: ".24em",
                            color: "#FFD9BE",
                          }}
                        >
                          {c.role}
                        </span>
                        <span style={{ font: `600 12px ${FD}`, letterSpacing: ".2em", color: "rgba(255,217,190,.55)" }}>
                          {pad(i + 1)} — {pad(N)}
                        </span>
                      </div>
                      <div data-sub="1" aria-label={c.name}>
                        <div
                          style={{
                            display: "flex",
                            font: `800 clamp(64px,${fsVw}vw,220px)/0.86 ${FP}`,
                            letterSpacing: "-.02em",
                            color: "#fff",
                            // drop-shadow pós-clip: em fotos claras o text-shadow
                            // clipado virava retângulos cinza atrás das letras.
                            filter: "drop-shadow(0 14px 34px rgba(0,0,0,.55))",
                          }}
                        >
                          {nome.split("").map((ch, j) => (
                            <span
                              key={j}
                              aria-hidden
                              style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}
                            >
                              <span
                                data-letter={j}
                                style={{ display: "inline-block", willChange: "transform" }}
                              >
                                {ch}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div data-sub="2" style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 16 }}>
                        <span aria-hidden style={{ width: 54, height: 2, background: "linear-gradient(90deg,#F58432,#E0430C)" }} />
                        <span style={{ font: `500 clamp(14px,1.2vw,18px) ${FD}`, color: "rgba(255,240,228,.85)", letterSpacing: ".03em" }}>
                          {c.heroLine}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* data — teatro de estatísticas */}
                  <div
                    data-scene={2 + 2 * i}
                    data-type="data"
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0,
                      padding: "76px 24px 24px",
                      pointerEvents: "none",
                      perspective: "1400px",
                    }}
                  >
                    <div
                      data-bgphoto
                      aria-hidden
                      style={{ position: "absolute", inset: 0, opacity: 0.09, overflow: "hidden", willChange: "transform" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.photoUrl}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center 18%",
                          filter: "grayscale(1) contrast(.9) brightness(.7)",
                        }}
                      />
                    </div>
                    <div
                      data-ghost-num
                      aria-hidden
                      style={{
                        position: "absolute",
                        right: "-3vw",
                        bottom: "-8vh",
                        font: `800 30vw ${FP}`,
                        letterSpacing: "-.06em",
                        lineHeight: 1,
                        color: "transparent",
                        WebkitTextStroke: "2px rgba(242,100,33,.13)",
                        pointerEvents: "none",
                        willChange: "transform",
                      }}
                    >
                      {pad(i + 1)}
                    </div>

                    <div data-panel style={{ position: "relative", width: "min(1180px,100%)", willChange: "transform,filter" }}>
                      {/* header */}
                      <div
                        data-cascade="0"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 28,
                          paddingBottom: 26,
                          borderBottom: "1px solid rgba(255,180,120,.16)",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                          <div
                            style={{
                              width: 92,
                              height: 92,
                              borderRadius: 26,
                              overflow: "hidden",
                              border: "1px solid rgba(255,180,120,.35)",
                              boxShadow: "0 0 40px rgba(242,100,33,.25)",
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={c.photoUrl}
                              alt={c.fullName}
                              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }}
                            />
                          </div>
                          <div>
                            <div style={{ font: `600 12px ${FD}`, letterSpacing: ".28em", color: "#F58432" }}>
                              CLOSER {pad(i + 1)}
                            </div>
                            <div
                              style={{
                                font: `800 clamp(30px,3.2vw,46px)/1 ${FP}`,
                                color: "#F3E7DC",
                                letterSpacing: "-.02em",
                                marginTop: 6,
                              }}
                            >
                              {c.name}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ font: `600 11px ${FD}`, letterSpacing: ".22em", color: "#8d7a6c" }}>
                              TAXA DE
                              <br />
                              RECUPERAÇÃO
                            </div>
                          </div>
                          <div
                            data-ring
                            data-pct={c.recupPct}
                            style={{
                              position: "relative",
                              width: 148,
                              height: 148,
                              borderRadius: "50%",
                              background: `conic-gradient(#F26421 0%, ${RING_TRACK} 0)`,
                              boxShadow: "0 0 50px rgba(242,100,33,.28)",
                              flex: "none",
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                inset: 10,
                                borderRadius: "50%",
                                background: "#1d1510",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <span
                                data-count
                                data-target={c.recupPct}
                                data-suffix="%"
                                style={{ font: `800 36px ${FP}`, color: "#F3E7DC" }}
                              >
                                0%
                              </span>
                              <span style={{ font: `600 10px ${FD}`, letterSpacing: ".18em", color: "#8d7a6c", marginTop: 3 }}>
                                RECUP.
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* grid tipográfico de indicadores */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
                        {c.stats.map((st, j) => {
                          const cor = st.color === "#211A15" ? "#F3E7DC" : st.color;
                          return (
                            <div
                              key={st.label}
                              data-cascade={String(1 + j)}
                              style={{
                                padding: "clamp(16px,3.2vw,26px) clamp(12px,3.2vw,26px) clamp(14px,2.6vw,22px)",
                                borderBottom: j < 3 ? "1px solid rgba(255,180,120,.12)" : "none",
                                borderRight: j % 3 !== 2 ? "1px solid rgba(255,180,120,.12)" : "none",
                              }}
                            >
                              <div
                                data-count
                                data-target={st.n}
                                data-suffix={st.suf}
                                data-cidx={j}
                                style={{
                                  font: `800 clamp(26px,4.6vw,56px)/1 ${FP}`,
                                  color: cor,
                                  letterSpacing: "-.02em",
                                  textShadow: `0 0 34px ${cor}33`,
                                }}
                              >
                                0
                              </div>
                              <div
                                style={{
                                  marginTop: 10,
                                  font: `600 11px ${FD}`,
                                  letterSpacing: ".18em",
                                  color: "#8d7a6c",
                                }}
                              >
                                {st.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* funil */}
                      <div
                        data-cascade="7"
                        style={{ marginTop: 26, paddingTop: 24, borderTop: "1px solid rgba(255,180,120,.16)" }}
                      >
                        <div style={{ font: `600 11px ${FD}`, letterSpacing: ".26em", color: "#8d7a6c", marginBottom: 18 }}>
                          FUNIL DE RECUPERAÇÃO
                        </div>
                        {c.funnel.map((fb, j) => (
                          <div key={fb.label} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                            <div style={{ width: 128, flex: "none", font: `600 12.5px ${FD}`, color: "#cbb9a9", textAlign: "right" }}>
                              {fb.label}
                            </div>
                            <div
                              style={{
                                flex: 1,
                                height: 18,
                                background: "rgba(255,200,150,.1)",
                                borderRadius: 9,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                data-fill-bar
                                data-pct={fb.pct}
                                data-cidx={j}
                                style={{
                                  height: "100%",
                                  width: "0%",
                                  borderRadius: 9,
                                  background: fb.color,
                                  boxShadow: `0 0 20px ${fb.color}66`,
                                }}
                              />
                            </div>
                            <div style={{ width: 44, flex: "none", font: `700 15px ${FP}`, color: "#F3E7DC", textAlign: "right" }}>
                              {fb.val}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Cena final · dashboard comparativo */}
            <div
              data-scene={dashK}
              data-type="dash"
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0,
                padding: "76px 24px 22px",
                pointerEvents: "none",
                perspective: "1400px",
              }}
            >
              <DashScene data={data} />
            </div>
          </div>

          {/* vinheta + grain por cima de tudo */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: "radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(8,5,3,.55) 100%)",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage: GRAIN,
              opacity: 0.055,
              mixBlendMode: "overlay",
            }}
          />
        </div>
      </div>

      <style>{`
        .pvScroll{scrollbar-width:none}
        .pvScroll::-webkit-scrollbar{display:none}
        @keyframes pvLine{0%{transform:scaleY(0);transform-origin:top}45%{transform:scaleY(1);transform-origin:top}55%{transform:scaleY(1);transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}
        .pvDotWrap{position:relative;display:flex;align-items:center;justify-content:flex-end}
        .pvDotLabel{position:absolute;right:24px;padding:4px 11px;border-radius:12px;background:rgba(24,15,9,.92);border:1px solid rgba(255,180,120,.2);color:#FFD9BE;font:600 11px var(--font-dm-sans),sans-serif;letter-spacing:.06em;white-space:nowrap;opacity:0;transform:translateX(6px);transition:opacity .18s,transform .18s;pointer-events:none}
        .pvDotWrap:hover .pvDotLabel{opacity:1;transform:translateX(0)}
        .pvDot{width:9px;height:9px;border-radius:50%;border:none;cursor:pointer;background:rgba(255,200,150,.25);padding:0;transition:transform .25s,background .25s,box-shadow .25s}
        .pvDot:hover{transform:scale(1.3)}
        .pvDot[data-active="1"]{background:linear-gradient(135deg,#F58432,#E0430C);transform:scale(1.5);box-shadow:0 0 0 4px rgba(242,100,33,.18),0 0 14px rgba(224,67,12,.7)}
        @media (max-width:640px){.pvDots{display:none!important}}
      `}</style>
    </div>
  );

  return createPortal(overlay, document.body);
}
