/*
  Warnings:

  - You are about to drop the column `agendamento` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `noShow` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `recuperado` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `reuniaoRealizada` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `venceu` on the `Coluna` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Cliente" DROP COLUMN "agendamento",
DROP COLUMN "noShow",
DROP COLUMN "recuperado",
DROP COLUMN "reuniaoRealizada";

-- AlterTable
ALTER TABLE "Coluna" DROP COLUMN "venceu",
ADD COLUMN     "chave" TEXT;
