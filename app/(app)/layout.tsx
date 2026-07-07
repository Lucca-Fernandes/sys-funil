import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AppNav from "@/components/AppNav";
import ParallaxBackground from "@/components/ParallaxBackground";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.mustChangePassword) redirect("/definir-senha");

  return (
    <div className="relative min-h-screen">
      <ParallaxBackground />
      <AppNav nome={session.nome} closerId={session.sub} admin={session.isAdmin} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
