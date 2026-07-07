-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "agendamento" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "noShow" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recuperado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reuniaoRealizada" BOOLEAN NOT NULL DEFAULT false;
