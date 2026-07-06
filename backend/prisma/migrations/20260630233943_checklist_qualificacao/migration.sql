-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "confirmouSegmento" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "demonstrouDesmotivacao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "identificouDor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "multiplasCalls" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "negociacaoFrequente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parouDeResponder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "responsavelNaCall" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tamanhoEquipe" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tempoMercado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usaPlataforma" BOOLEAN NOT NULL DEFAULT false;
