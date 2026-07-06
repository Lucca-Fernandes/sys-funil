-- CreateTable
CREATE TABLE "Closer" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "avatarPath" TEXT,
    "avatarData" BYTEA,
    "avatarMimeType" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Closer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "segmento" TEXT NOT NULL DEFAULT 'Não Informado',
    "numeroResgates" INTEGER NOT NULL DEFAULT 0,
    "conseguiRetorno" INTEGER NOT NULL DEFAULT 0,
    "naoConseguiRetorno" INTEGER NOT NULL DEFAULT 0,
    "linkCliente" TEXT,
    "anotacoes" TEXT,
    "leadResgatado" BOOLEAN NOT NULL DEFAULT false,
    "agendamento" BOOLEAN NOT NULL DEFAULT false,
    "reuniaoRealizada" BOOLEAN NOT NULL DEFAULT false,
    "noShow" BOOLEAN NOT NULL DEFAULT false,
    "vendaFechada" BOOLEAN NOT NULL DEFAULT false,
    "closerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Closer_email_key" ON "Closer"("email");

-- CreateIndex
CREATE INDEX "Cliente_closerId_idx" ON "Cliente"("closerId");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_closerId_fkey" FOREIGN KEY ("closerId") REFERENCES "Closer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
