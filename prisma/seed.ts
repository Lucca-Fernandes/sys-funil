// Seed de onboarding: cria a conta inicial do GESTOR (e nada mais).
// Roda uma vez após provisionar o banco (npm run db:seed). Usa a conexão
// DIRETA (DIRECT_URL). E-mail/senha vêm do ambiente — nunca do código:
//   SEED_ADMIN_NAME · SEED_ADMIN_EMAIL · SEED_ADMIN_PASSWORD
//
// A partir do gestor, os closers reais são criados pelo painel /admin, cada um
// com senha temporária e troca obrigatória no primeiro acesso.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const NOME = (process.env.SEED_ADMIN_NAME ?? "Gestor").trim();
const EMAIL = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
const SENHA = process.env.SEED_ADMIN_PASSWORD ?? "";

async function main() {
  if (!EMAIL || !SENHA) {
    throw new Error("Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no ambiente (.env).");
  }

  const senhaHash = await bcrypt.hash(SENHA, 10);
  // Idempotente: se a conta já existe, não sobrescreve a senha atual.
  const gestor = await prisma.closer.upsert({
    where: { email: EMAIL },
    update: {},
    create: {
      nome: NOME,
      email: EMAIL,
      senhaHash,
      isAdmin: true,
      ativo: true,
      mustChangePassword: false,
    },
  });

  console.log(`✓ Gestor pronto: ${gestor.nome} <${gestor.email}>`);
  console.log("  Próximo passo: entrar no painel /admin e criar os acessos dos closers.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
