-- AlterTable
ALTER TABLE "wallets" ALTER COLUMN "currency" SET DEFAULT 'USD';
-- Migrar saldos existentes de FUN a USD (mismo valor, solo el rótulo)
UPDATE wallets SET currency = 'USD' WHERE currency = 'FUN';
