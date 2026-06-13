-- CreateEnum
CREATE TYPE "UserMode" AS ENUM ('BUYER', 'SELLER');

-- AlterTable: modo activo de la cuenta (no es un permiso, las capacidades viven en role)
ALTER TABLE "User" ADD COLUMN "activeMode" "UserMode" NOT NULL DEFAULT 'BUYER';

-- Backfill: las cuentas que sólo eran vendedoras arrancan en modo vendedor.
UPDATE "User" SET "activeMode" = 'SELLER' WHERE "role" = 'SELLER';

-- Nuevas cuentas son compradoras por defecto (la capacidad vendedor es opcional).
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'BUYER';
