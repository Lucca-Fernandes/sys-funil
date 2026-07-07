// Proteção de rotas + gate de troca de senha obrigatória.
// Roda no Edge Runtime: valida o JWT do cookie (sem acesso ao banco).
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Rotas acessíveis sem sessão.
const PUBLIC_PATHS = ["/login"];
const PUBLIC_API = ["/api/auth/login"];

// Rotas liberadas mesmo com mustChangePassword === true.
const CHANGE_PW_ALLOWED = ["/definir-senha"];
const CHANGE_PW_ALLOWED_API = [
  "/api/auth/change-password",
  "/api/auth/logout",
  "/api/auth/me",
];

function isApi(pathname: string) {
  return pathname.startsWith("/api/");
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isPublicApi = PUBLIC_API.some((p) => pathname === p);

  // --- Sem sessão válida ---
  if (!session) {
    if (isPublicPage || isPublicApi) return NextResponse.next();
    if (isApi(pathname)) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // --- Sessão válida ---

  // Já logado e tentando acessar /login → manda pra home.
  if (isPublicPage) {
    const url = req.nextUrl.clone();
    url.pathname = session.mustChangePassword ? "/definir-senha" : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Precisa trocar a senha: bloqueia tudo, exceto rotas liberadas.
  if (session.mustChangePassword) {
    const allowedPage = CHANGE_PW_ALLOWED.some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    );
    const allowedApi = CHANGE_PW_ALLOWED_API.some((p) => pathname === p);
    if (!allowedPage && !allowedApi) {
      if (isApi(pathname)) {
        return NextResponse.json(
          { error: "Troca de senha obrigatória." },
          { status: 403 },
        );
      }
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
