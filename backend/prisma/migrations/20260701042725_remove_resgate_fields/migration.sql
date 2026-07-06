/*
  Warnings:

  - You are about to drop the column `conseguiRetorno` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `naoConseguiRetorno` on the `Cliente` table. All the data in the column will be lost.
  - You are about to drop the column `numeroResgates` on the `Cliente` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Cliente" DROP COLUMN "conseguiRetorno",
DROP COLUMN "naoConseguiRetorno",
DROP COLUMN "numeroResgates";
