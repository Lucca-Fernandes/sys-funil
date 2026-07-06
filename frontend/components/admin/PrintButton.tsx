"use client";

/** Aciona a impressão do navegador (Salvar como PDF). */
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-brand transition hover:brightness-105"
    >
      🖨️ Imprimir · Salvar PDF
    </button>
  );
}
