"use client";
import { apiFetch } from "@/lib/api";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/Logo";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/fundo-de-funil", label: "Fundo de Funil" },
  { href: "/perfil", label: "Perfil" },
];
const LINK_ADMIN = { href: "/admin", label: "Admin" };

export default function AppNav({
  nome,
  closerId,
  admin = false,
}: {
  nome: string;
  closerId: string;
  admin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  // Gestor não opera quadro de leads: sem "Fundo de Funil" na navegação.
  const links = admin
    ? [...LINKS.filter((l) => l.href !== "/fundo-de-funil"), LINK_ADMIN]
    : LINKS;

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 glass">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" aria-label="meeventos">
            <Logo size={30} />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const ativo = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                    ativo
                      ? "bg-brand-500 text-white shadow-brand"
                      : "text-ink-soft hover:bg-white/5 hover:text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/closers/${closerId}/avatar`}
              alt={nome}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-brand-500/40"
            />
            <span className="hidden text-sm font-semibold text-ink sm:inline">{nome}</span>
          </div>
          <button
            onClick={logout}
            className="rounded-xl border border-brand-500/40 px-3 py-1.5 text-sm font-semibold text-brand-400 transition hover:bg-brand-500/10"
          >
            Sair
          </button>
        </div>
      </div>

      {/* nav mobile */}
      <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden">
        {links.map((l) => {
          const ativo = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                ativo ? "bg-brand-500 text-white" : "text-ink-soft hover:bg-white/5"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
