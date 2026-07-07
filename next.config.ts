import type { NextConfig } from "next";

// Cabeçalhos de segurança aplicados a todas as respostas.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // O navegador recebe o mínimo: sem source maps em produção (o JS do cliente
  // fica só minificado, sem nomes/estrutura de pastas) e sem header X-Powered-By.
  // Código de servidor (páginas SSR, rotas /api, Prisma, segredos) nunca é enviado.
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
