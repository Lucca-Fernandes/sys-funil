// Prisma CLI configuration (Prisma 7+).
// The CLI (migrate / db push / seed) must use the DIRECT connection (no -pooler),
// otherwise PgBouncer can throw errors like `prepared statement "s0" already exists`.
// The application at runtime uses the pooled DATABASE_URL (see app/lib/prisma.ts).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Seed runs through tsx so we can write the seed in TypeScript.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI uses the DIRECT (non-pooled) connection.
    url: process.env["DIRECT_URL"],
  },
});
