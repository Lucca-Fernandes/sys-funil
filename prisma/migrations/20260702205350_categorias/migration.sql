-- AlterTable
ALTER TABLE "Coluna" ADD COLUMN     "categoriaId" TEXT;

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "closerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Categoria_closerId_idx" ON "Categoria"("closerId");

-- CreateIndex
CREATE INDEX "Coluna_categoriaId_idx" ON "Coluna"("categoriaId");

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_closerId_fkey" FOREIGN KEY ("closerId") REFERENCES "Closer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coluna" ADD CONSTRAINT "Coluna_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
