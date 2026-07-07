"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function AvatarUpload({
  closerId,
  temFotoEnviada,
}: {
  closerId: string;
  temFotoEnviada: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  // Cache-buster para forçar recarregar a imagem após upload/remoção.
  const [v, setV] = useState(0);

  async function enviar(file: File) {
    setErro(null);
    setMsg(null);
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.error ?? "Falha no upload.");
        return;
      }
      setMsg("Foto atualizada.");
      setV((n) => n + 1);
      router.refresh();
    } catch {
      setErro("Erro de conexão.");
    } finally {
      setEnviando(false);
    }
  }

  async function remover() {
    setErro(null);
    setMsg(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.error ?? "Falha ao remover.");
        return;
      }
      setMsg("Foto removida. Usando a foto inicial/padrão.");
      setV((n) => n + 1);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/closers/${closerId}/avatar?v=${v}`}
        alt="Sua foto"
        className="h-24 w-24 rounded-2xl object-cover ring-2 ring-brand-500/40"
      />
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) enviar(f);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-brand transition hover:brightness-105 disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "Enviar nova foto"}
          </button>
          {temFotoEnviada && (
            <button
              type="button"
              onClick={remover}
              disabled={enviando}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-white/5 disabled:opacity-60"
            >
              Remover foto
            </button>
          )}
        </div>
        <p className="text-xs text-ink-soft">PNG, JPG, WEBP ou GIF — até 4 MB.</p>
        {erro && <p className="text-sm text-red-400">{erro}</p>}
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      </div>
    </div>
  );
}
