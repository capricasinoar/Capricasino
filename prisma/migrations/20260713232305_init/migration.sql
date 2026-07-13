-- Extensión para email/username case-insensitive (tipo CITEXT)
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'self_excluded', 'closed');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('none', 'pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('bet', 'win', 'rollback', 'deposit', 'withdrawal', 'bonus_grant', 'cashback', 'adjustment');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'completed', 'reversed');

-- CreateEnum
CREATE TYPE "EntryDirection" AS ENUM ('debit', 'credit');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('direct', 'aggregator', 'simulated');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('slot', 'live', 'crash', 'table', 'instant', 'original');

-- CreateEnum
CREATE TYPE "Volatility" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "GameSessionStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('open', 'settled', 'cancelled');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('placed', 'won', 'lost', 'cancelled');

-- CreateEnum
CREATE TYPE "BonusType" AS ENUM ('deposit_match', 'free_spins', 'cashback', 'no_deposit');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('active', 'paused', 'ended');

-- CreateEnum
CREATE TYPE "GrantStatus" AS ENUM ('active', 'completed', 'expired', 'forfeited');

-- CreateEnum
CREATE TYPE "FreeSpinStatus" AS ENUM ('active', 'completed', 'expired');

-- CreateEnum
CREATE TYPE "JackpotType" AS ENUM ('fixed', 'progressive');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('deposit', 'withdrawal');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('support', 'risk', 'finance', 'super_admin');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "username" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "country" TEXT,
    "vip_level" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'none',
    "date_of_birth" DATE,
    "affiliate_id" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cash_balance" BIGINT NOT NULL DEFAULT 0,
    "bonus_balance" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'FUN',
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip" INET,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "provider_tx_id" TEXT,
    "provider_id" UUID,
    "round_id" UUID,
    "amount" BIGINT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'completed',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "account" TEXT NOT NULL,
    "direction" "EntryDirection" NOT NULL,
    "amount" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProviderType" NOT NULL,
    "status" "ProviderStatus" NOT NULL DEFAULT 'active',
    "config" JSONB,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "GameType" NOT NULL,
    "rtp" DECIMAL(5,2),
    "volatility" "Volatility",
    "thumbnail_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "release_date" DATE,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_categories" (
    "game_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "game_categories_pkey" PRIMARY KEY ("game_id","category_id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "launch_token" TEXT NOT NULL,
    "status" "GameSessionStatus" NOT NULL DEFAULT 'open',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" UUID NOT NULL,
    "game_session_id" UUID NOT NULL,
    "provider_round_id" TEXT NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'open',
    "total_bet" BIGINT NOT NULL DEFAULT 0,
    "total_win" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMPTZ,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" UUID NOT NULL,
    "round_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "win_amount" BIGINT NOT NULL DEFAULT 0,
    "status" "BetStatus" NOT NULL DEFAULT 'placed',
    "result_data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonus_campaigns" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BonusType" NOT NULL,
    "amount" BIGINT,
    "percentage" DECIMAL(5,2),
    "wagering_multiplier" INTEGER NOT NULL,
    "game_contribution" JSONB,
    "valid_from" TIMESTAMPTZ,
    "valid_to" TIMESTAMPTZ,
    "status" "CampaignStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "bonus_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonus_grants" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "wagering_target" BIGINT NOT NULL,
    "wagering_progress" BIGINT NOT NULL DEFAULT 0,
    "status" "GrantStatus" NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMPTZ,

    CONSTRAINT "bonus_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "free_spin_grants" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "spins_total" INTEGER NOT NULL,
    "spins_used" INTEGER NOT NULL DEFAULT 0,
    "spin_value" BIGINT NOT NULL,
    "status" "FreeSpinStatus" NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMPTZ,

    CONSTRAINT "free_spin_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jackpots" (
    "id" UUID NOT NULL,
    "provider_id" UUID,
    "name" TEXT NOT NULL,
    "type" "JackpotType" NOT NULL,
    "current_amount" BIGINT NOT NULL,
    "seed_amount" BIGINT NOT NULL,
    "last_won_at" TIMESTAMPTZ,
    "last_won_by" UUID,

    CONSTRAINT "jackpots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'fake',
    "status" "PaymentStatus" NOT NULL DEFAULT 'completed',
    "psp_ref" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_ref" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,

    CONSTRAINT "kyc_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "totp_secret" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" INET,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_created_at_idx" ON "transactions"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_provider_id_provider_tx_id_key" ON "transactions"("provider_id", "provider_tx_id");

-- CreateIndex
CREATE INDEX "ledger_entries_account_created_at_idx" ON "ledger_entries"("account", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "providers_code_key" ON "providers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "games_provider_id_code_key" ON "games"("provider_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "game_sessions_launch_token_key" ON "game_sessions"("launch_token");

-- CreateIndex
CREATE INDEX "game_sessions_user_id_idx" ON "game_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_game_session_id_provider_round_id_key" ON "rounds"("game_session_id", "provider_round_id");

-- CreateIndex
CREATE INDEX "bets_user_id_created_at_idx" ON "bets"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bonus_campaigns_code_key" ON "bonus_campaigns"("code");

-- CreateIndex
CREATE INDEX "bonus_grants_user_id_idx" ON "bonus_grants"("user_id");

-- CreateIndex
CREATE INDEX "payment_transactions_user_id_created_at_idx" ON "payment_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_code_key" ON "affiliates"("code");

-- CreateIndex
CREATE INDEX "events_type_created_at_idx" ON "events"("type", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_categories" ADD CONSTRAINT "game_categories_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_categories" ADD CONSTRAINT "game_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "game_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_grants" ADD CONSTRAINT "bonus_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_grants" ADD CONSTRAINT "bonus_grants_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "bonus_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_spin_grants" ADD CONSTRAINT "free_spin_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_spin_grants" ADD CONSTRAINT "free_spin_grants_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jackpots" ADD CONSTRAINT "jackpots_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_records" ADD CONSTRAINT "kyc_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────
-- TRAMPA #7 (docs/architecture.md Cap. 5.3): el saldo negativo debe
-- ser IMPOSIBLE a nivel de base de datos, no solo a nivel de código.
-- Estas constraints son la última línea de defensa: ninguna race
-- condition puede cruzarlas.
ALTER TABLE "wallets" ADD CONSTRAINT "cash_non_negative"  CHECK ("cash_balance" >= 0);
ALTER TABLE "wallets" ADD CONSTRAINT "bonus_non_negative" CHECK ("bonus_balance" >= 0);

-- Un asiento del ledger siempre es positivo (el signo lo da direction)
ALTER TABLE "ledger_entries" ADD CONSTRAINT "amount_positive" CHECK ("amount" > 0);

-- Una apuesta nunca es negativa
ALTER TABLE "bets" ADD CONSTRAINT "bet_amount_positive"  CHECK ("amount" > 0);
ALTER TABLE "bets" ADD CONSTRAINT "win_non_negative"     CHECK ("win_amount" >= 0);
