import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import AvatarUpload from "@/components/AvatarUpload";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const closer = await prisma.closer.findUnique({
    where: { id: session.sub },
    select: { id: true, nome: true, email: true, avatarData: true },
  });
  if (!closer) redirect("/login");

  const temFotoEnviada = closer.avatarData != null;

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
        <AvatarUpload closerId={closer.id} temFotoEnviada={temFotoEnviada} />
      </section>

      <section className="glass rounded-3xl border border-white/10 p-6 card-elev">
        <h2 className="mb-4 font-display text-lg font-bold text-ink">Trocar senha</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
