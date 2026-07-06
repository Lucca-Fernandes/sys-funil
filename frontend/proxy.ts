// Proteção de páginas + gate de troca de senha obrigatória (Edge Runtime).
// Verifica o JWT do cookie de sessão — que o backend seta no mesmo host (dev) ou
// no domínio-pai compartilhado (prod). O backend continua sendo o guardião real
// das APIs; aqui só decidimos redirecionamentos de navegação.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Rotas acessíveis sem sessão.
const PUBLIC_PATHS = ["/login"];
// Rotas liberadas mesmo com mustChangePassword === true.
const CHANGE_PW_ALLOWED = ["/definir-senha"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // --- Sem sessão válida ---
  if (!session) {
    if (isPublic) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // --- Sessão válida ---

  // Já logado tentando acessar /login → manda pra home (ou troca de senha).
  if (isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = session.mustChangePassword ? "/definir-senha" : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Precisa trocar a senha: bloqueia tudo, exceto /definir-senha.
  if (session.mustChangePassword) {
    const allowed = CHANGE_PW_ALLOWED.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (!allowed) {
      const url = req.nextUrl.clone();
      url.pathname = "/definir-senha";
      url.search = "";
      return NextResponse.redirect(url);
    }
  } else if (CHANGE_PW_ALLOWED.includes(pathname)) {
    // Não precisa mais trocar; sai da tela de definir senha.
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Aplica a tudo, exceto assets estáticos e otimização de imagem do Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
