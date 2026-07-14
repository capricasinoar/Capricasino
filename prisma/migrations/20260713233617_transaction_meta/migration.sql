-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "balance_after" BIGINT,
ADD COLUMN     "meta" JSONB;
