/*
  Warnings:

  - You are about to drop the column `agendamento` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `leadResgatado` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `noShow` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `reuniaoRealizada` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `vendaFechada` on the `Cliente` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Cliente" DROP COLUMN "agendamento",
DROP COLUMN "leadResgatado",
DROP COLUMN "noShow",
DROP COLUMN "reuniaoRealizada",
DROP COLUMN "vendaFechada",
ADD COLUMN     "canais" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "colunaId" TEXT,
ADD COLUMN     "contatosRealizados" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Coluna" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#f97316',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "venceu" BOOLEAN NOT NULL DEFAULT false,
    "closerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coluna_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Coluna_closerId_idx" ON "Coluna"("closerId");

-- CreateIndex
CREATE INDEX "Cliente_colunaId_idx" ON "Cliente"("colunaId");

-- AddForeignKey
ALTER TABLE "Coluna" ADD CONSTRAINT "Coluna_closerId_fkey" FOREIGN KEY ("closerId") REFERENCES "Closer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_colunaId_fkey" FOREIGN KEY ("colunaId") REFERENCES "Coluna"("id") ON DELETE SET NULL ON UPDATE CASCADE;
