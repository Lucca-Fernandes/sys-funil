import { redirect } from "next/navigation";
import { apiServerJson } from "@/lib/api-server";
import AvatarUpload from "@/components/AvatarUpload";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export const dynamic = "force-dynamic";

type PerfilResp = {
  closer: { id: string; nome: string; email: string; temFotoEnviada: boolean };
};

export default async function PerfilPage() {
  const { ok, data } = await apiServerJson<PerfilResp>("/api/views/perfil");
  if (!ok || !data) redirect("/login");
  const { closer } = data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-brand-gradient p-6 text-white shadow-brand animate-rise sm:p-7">
        <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl animate-float" />
        <h1 className="relative font-display text-3xl font-extrabold tracking-tight">Perfil</h1>
        <p className="relative mt-1 text-sm text-white/85">Gerencie sua foto e sua senha.</p>
      </section>

      <section className="glass rounded-3xl border border-white/10 p-6 card-elev">
        <h2 className="font-display text-lg font-bold text-ink">{closer.nome}</h2>
        <p className="mb-5 text-sm text-ink-soft">{closer.email}</p>
        <AvatarUpload closerId={closer.id} temFotoEnviada={closer.temFotoEnviada} />
      </section>

      <section className="glass rounded-3xl border border-white/10 p-6 card-elev">
        <h2 className="mb-4 font-display text-lg font-bold text-ink">Trocar senha</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
