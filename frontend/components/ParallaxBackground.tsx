"use client";

import { useEffect, useRef } from "react";

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Fundo do modo cinema — mesma linguagem da aba Apresentação: base escura com
 * brilhos laranja, ondas orgânicas, orbs de luz, marcas d'água e grain.
 * Camadas com [data-depth] reagem ao mouse e ao scroll (parallax).
 */
export default function ParallaxBackground({ variant = "app" }: { variant?: "app" | "auth" }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let mx = 0;
    let my = 0;
    let sy = 0;

    const apply = () => {
      const layers = el.querySelectorAll<HTMLElement>("[data-depth]");
      layers.forEach((layer) => {
        const d = Number(layer.dataset.depth ?? "0");
        const x = mx * d * 40;
        const y = my * d * 40 + sy * d * 0.25;
        layer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
      raf = 0;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
      schedule();
    };
    const onScroll = () => {
      sy = window.scrollY;
      schedule();
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-brand-radial"
    >
      {/* ondas orgânicas (linguagem de curvas da mee) */}
      <svg
        data-depth="0.25"
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
        className="absolute -left-[20%] -top-[5%] h-[110%] w-[140%]"
      >
        <path
          d="M-100,220 C260,140 520,300 880,230 S1420,90 1750,190"
          fill="none"
          stroke="rgba(242,100,33,.1)"
          strokeWidth="2"
        />
        <path
          d="M-100,520 C300,430 640,610 1000,520 S1500,380 1750,470"
          fill="none"
          stroke="rgba(242,100,33,.08)"
          strokeWidth="2"
        />
        <path
          d="M-100,760 C260,690 560,830 920,750 S1460,640 1750,720"
          fill="none"
          stroke="rgba(245,132,50,.09)"
          strokeWidth="2"
        />
        <path
          d="M-100,900 L-100,830 C400,770 900,885 1750,810 L1750,900 Z"
          fill="rgba(242,100,33,.045)"
        />
      </svg>

      {/* orbs de luz */}
      <div
        data-depth="1.1"
        className="absolute -left-24 -top-24 h-[26rem] w-[26rem] rounded-full animate-blob"
        style={{ background: "radial-gradient(circle, rgba(242,100,33,.2) 0%, transparent 68%)" }}
      />
      <div
        data-depth="0.7"
        className="absolute right-[-8rem] top-10 h-[22rem] w-[22rem] rounded-full animate-float"
        style={{ background: "radial-gradient(circle, rgba(224,67,12,.18) 0%, transparent 68%)" }}
      />
      <div
        data-depth="1.5"
        className="absolute bottom-[-10rem] left-1/3 h-[28rem] w-[28rem] rounded-full animate-float-slow"
        style={{ background: "radial-gradient(circle, rgba(245,132,50,.15) 0%, transparent 68%)" }}
      />
      {variant === "auth" && (
        <div
          data-depth="0.4"
          className="absolute bottom-10 right-1/4 h-40 w-40 rounded-full animate-float"
          style={{ background: "radial-gradient(circle, rgba(242,100,33,.22) 0%, transparent 68%)" }}
        />
      )}

      {/* marca d'água tipográfica */}
      <div
        data-depth="0.15"
        className="absolute -left-[4%] top-[8%] whitespace-nowrap font-display font-extrabold leading-none"
        style={{ fontSize: "clamp(120px,18vw,300px)", letterSpacing: "-.05em", color: "rgba(242,100,33,.06)" }}
      >
        meeventos
      </div>
      <div
        data-depth="0.3"
        className="absolute -right-[6%] bottom-[5%] whitespace-nowrap font-display font-extrabold leading-none"
        style={{ fontSize: "clamp(120px,18vw,300px)", letterSpacing: "-.05em", color: "rgba(224,67,12,.05)" }}
      >
        meeventos
      </div>

      {/* vinheta + grain */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(8,5,3,.5) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{ backgroundImage: GRAIN, opacity: 0.05, mixBlendMode: "overlay" }}
      />
    </div>
  );
}
