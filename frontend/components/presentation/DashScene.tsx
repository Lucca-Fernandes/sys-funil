"use client";

import { useEffect, useMemo, useState } from "react";
import type { PresentationData, PresMetricKey } from "@/lib/presentation";

const FP = "var(--font-poppins), sans-serif"; // display / números
const FD = "var(--font-dm-sans), sans-serif"; // texto / labels

// Tokens do modo cinema (dark) — mesmos do handoff.
const INK = "#F3E7DC";
const SOFT = "#cbb9a9";
const MUTED = "#ab9889";
const CARD = "#221913";
const CARD_BORDER = "1px solid rgba(255,180,120,.12)";
const CARD_SHADOW = "0 14px 40px rgba(0,0,0,.4)";
const TRACK = "rgba(255,200,150,.12)";
const HOVER = "rgba(255,200,150,.08)";
const RING_TRACK = "rgba(255,210,170,.14)";

const METRIC_ORDER: PresMetricKey[] = ["recuperados", "interesse", "meshow", "taxa"];

/**
 * Cena final do palco: dashboard comparativo interativo (modo cinema).
 * Estado próprio (métrica + hovers) isolado do engine de scroll — números/anéis
 * são preenchidos imperativamente pelo engine via [data-count]/[data-ring], e os
 * blocos entram em cascata via [data-dcascade].
 */
export default function DashScene({ data }: { data: PresentationData }) {
  const [metric, setMetric] = useState<PresMetricKey>("recuperados");
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [hoverStep, setHoverStep] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const def = data.metrics[metric];
  const { vals, max, avg } = useMemo(() => {
    const vals = data.closers.map((c) => c.metrics[metric]);
    const max = Math.max(1, ...vals);
    const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    return { vals, max, avg };
  }, [data.closers, metric]);

  return (
    <div
      data-panel
      style={{
        position: "relative",
        width: "min(1280px,100%)",
        willChange: "transform,filter",
      }}
    >
      {/* Header */}
      <div
        data-dcascade="0"
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 20,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ font: `600 11px ${FD}`, letterSpacing: ".32em", color: "#F58432" }}>
            VISÃO GERAL · SOMENTE LEITURA
          </div>
          <h2
            style={{
              font: `800 clamp(30px,3.4vw,48px)/1 ${FP}`,
              margin: "8px 0 0",
              letterSpacing: "-.02em",
              color: INK,
              textShadow: "0 8px 40px rgba(0,0,0,.5)",
            }}
          >
            Dashboard do funil
          </h2>
        </div>
      </div>

      {/* KPIs (count-up dirigido pelo engine de scroll) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)",
          gap: isMobile ? 9 : 13,
          marginBottom: 14,
        }}
      >
        {data.kpis.map((k, i) => {
          const cor = k.color === "#211A15" ? INK : k.color;
          return (
            <div
              key={k.label}
              data-dcascade={String(1 + i)}
              style={{
                background: CARD,
                border: CARD_BORDER,
                borderRadius: 16,
                padding: "16px 18px",
                boxShadow: CARD_SHADOW,
              }}
            >
              <div
                data-count
                data-target={k.value}
                data-suffix={k.suf}
                data-cidx={i}
                style={{
                  font: `800 34px ${FP}`,
                  lineHeight: 1,
                  color: cor,
                  textShadow: `0 0 30px ${cor}33`,
                }}
              >
                0
              </div>
              <div
                style={{
                  marginTop: 7,
                  font: `600 11px ${FD}`,
                  letterSpacing: ".09em",
                  color: MUTED,
                }}
              >
                {k.label}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.12fr 0.88fr", gap: 13 }}>
        {/* COMPARATIVO ENTRE CLOSERS */}
        <div
          data-dcascade="5"
          style={{
            background: CARD,
            border: CARD_BORDER,
            borderRadius: 18,
            padding: "18px 20px",
            boxShadow: CARD_SHADOW,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ font: `700 15px ${FP}`, color: INK }}>Comparativo entre closers</div>
              <div style={{ marginTop: 2, font: `600 11px ${FD}`, color: MUTED }}>
                média {avg}
                {def.suf}
              </div>
            </div>
            <div
              style={{
                display: "inline-flex",
                background: "rgba(255,200,150,.1)",
                borderRadius: 11,
                padding: 3,
                gap: 2,
              }}
            >
              {METRIC_ORDER.map((m) => {
                const on = m === metric;
                return (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    style={{
                      border: "none",
                      background: on ? "#3a2a1e" : "transparent",
                      cursor: "pointer",
                      font: `600 11px ${FD}`,
                      padding: "6px 10px",
                      borderRadius: 8,
                      color: on ? INK : "#b6a596",
                      boxShadow: on ? "0 2px 8px rgba(0,0,0,.4)" : "none",
                      transition: "color .2s",
                    }}
                  >
                    {data.metrics[m].label}
                  </button>
                );
              })}
            </div>
          </div>

          {data.closers.map((c, i) => {
            const v = vals[i];
            const delta = v - avg;
            return (
              <div
                key={c.id}
                onMouseEnter={() => setHoverRow(i)}
                onMouseLeave={() => setHoverRow((h) => (h === i ? null : h))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "6px 8px",
                  borderRadius: 11,
                  transition: "background .2s",
                  background: hoverRow === i ? HOVER : "transparent",
                }}
              >
                <div
                  style={{
                    width: 29,
                    height: 29,
                    borderRadius: 9,
                    background: "linear-gradient(135deg,#F58432,#E0430C)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    font: `700 13px ${FP}`,
                    flex: "none",
                    boxShadow: "0 0 14px rgba(242,100,33,.35)",
                  }}
                >
                  {c.initial}
                </div>
                <div
                  style={{
                    width: isMobile ? 56 : 74,
                    flex: "none",
                    font: `600 13px ${FD}`,
                    color: INK,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.name}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 22,
                    background: TRACK,
                    borderRadius: 7,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(v / max) * 100}%`,
                      borderRadius: 7,
                      background: def.color,
                      boxShadow: `0 0 18px ${def.color}66`,
                      transition: "width .55s cubic-bezier(.22,1,.36,1),background .3s",
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 48,
                    flex: "none",
                    textAlign: "right",
                    font: `800 15px ${FP}`,
                    color: INK,
                  }}
                >
                  {v}
                  {def.suf}
                </div>
                {!isMobile && (
                  <div
                    style={{
                      width: 80,
                      flex: "none",
                      textAlign: "right",
                      font: `600 10.5px ${FD}`,
                      opacity: hoverRow === i ? 1 : 0,
                      transition: "opacity .2s",
                      color: delta >= 0 ? "#22c55e" : "#ff5c4d",
                    }}
                  >
                    {delta >= 0 ? "+" : ""}
                    {delta}
                    {def.suf} vs média
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* FUNIL CONSOLIDADO */}
        <div
          data-dcascade="6"
          style={{
            background: CARD,
            border: CARD_BORDER,
            borderRadius: 18,
            padding: "18px 20px",
            boxShadow: CARD_SHADOW,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div style={{ font: `700 15px ${FP}`, color: INK }}>Funil consolidado</div>
            <div
              data-ring
              data-pct={data.taxaGeral}
              style={{
                position: "relative",
                width: 70,
                height: 70,
                borderRadius: "50%",
                background: `conic-gradient(#F26421 0%, ${RING_TRACK} 0)`,
                boxShadow: "0 0 28px rgba(242,100,33,.25)",
                flex: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 7,
                  borderRadius: "50%",
                  background: CARD,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  data-count
                  data-target={data.taxaGeral}
                  data-suffix="%"
                  style={{ font: `800 17px ${FP}`, color: INK }}
                >
                  0%
                </span>
                <span style={{ font: `600 7.5px ${FD}`, letterSpacing: ".1em", color: MUTED }}>
                  TAXA GERAL
                </span>
              </div>
            </div>
          </div>

          {data.funnelC.map((s, i) => (
            <div
              key={s.label}
              onMouseEnter={() => setHoverStep(i)}
              onMouseLeave={() => setHoverStep((h) => (h === i ? null : h))}
              style={{
                padding: "6px 8px",
                borderRadius: 11,
                transition: "background .2s",
                marginBottom: 2,
                background: hoverStep === i ? HOVER : "transparent",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 5,
                }}
              >
                <span style={{ font: `600 12.5px ${FD}`, color: SOFT }}>{s.label}</span>
                <span>
                  <span style={{ font: `800 15px ${FP}`, color: INK }}>{s.count}</span>
                  <span style={{ font: `600 11px ${FD}`, color: MUTED }}> · {s.pct}%</span>
                </span>
              </div>
              <div
                style={{
                  height: 14,
                  background: TRACK,
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${s.pct}%`,
                    borderRadius: 6,
                    background: s.color,
                    boxShadow: `0 0 16px ${s.color}55`,
                    transition: "width .6s cubic-bezier(.22,1,.36,1)",
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: 4,
                  font: `600 10.5px ${FD}`,
                  color: MUTED,
                  opacity: hoverStep === i ? 1 : 0,
                  transition: "opacity .2s",
                }}
              >
                conversão da etapa anterior: {s.conv}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
