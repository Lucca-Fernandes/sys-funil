// Cria os closers da meeventos + o gestor. Usa a conexão DIRETA (DIRECT_URL).
// A foto de cada closer é importada de assets/avatars/<slug>.jpeg para o banco
// (Closer.avatarData) — o runtime nunca lê imagem do disco. Se o arquivo não
// existir, o closer nasce com o avatar de iniciais (fallback).
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "senha123";
const AVATARS_DIR = path.join(process.cwd(), "assets", "avatars");

const CLOSERS = [
  { nome: "Alessandra", slug: "alessandra" },
  { nome: "Guilherme", slug: "guilherme" },
  { nome: "Jonatha", slug: "jonatha" },
  { nome: "Melissa", slug: "melissa" },
  { nome: "Raquel", slug: "raquel" },
  { nome: "Rita", slug: "rita" },
  { nome: "Sara", slug: "sara" },
];

async function lerAvatar(slug: string): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    const buf = await readFile(path.join(AVATARS_DIR, `${slug}.jpeg`));
    const bytes = new Uint8Array(buf.byteLength);
    bytes.set(buf);
    return bytes;
  } catch {
    return null;
  }
}

async function main() {
  const senhaHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const c of CLOSERS) {
    const email = `${c.slug}@meeventos.com`;
    const avatar = await lerAvatar(c.slug);
    await prisma.closer.upsert({
      where: { email },
      update: { nome: c.nome },
      create: {
        nome: c.nome,
        email,
        senhaHash,
        mustChangePassword: true,
        ...(avatar ? { avatarData: avatar, avatarMimeType: "image/jpeg" } : {}),
      },
    });
    console.log(`✓ Closer pronto: ${c.nome} <${email}>${avatar ? "" : " (sem foto)"}`);
  }

  await prisma.closer.upsert({
    where: { email: "admin@meeventos.com" },
    update: { isAdmin: true },
    create: {
      nome: "Gestão meeventos",
      email: "admin@meeventos.com",
      senhaHash,
      isAdmin: true,
      mustChangePassword: true,
    },
  });
  console.log("✓ Gestor pronto: Gestão meeventos <admin@meeventos.com>");

  console.log(`\nSenha padrão: "${DEFAULT_PASSWORD}" (troca obrigatória no 1º acesso).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
