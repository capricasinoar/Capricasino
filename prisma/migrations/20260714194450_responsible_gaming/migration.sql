-- CreateEnum
CREATE TYPE "LimitKind" AS ENUM ('daily_wager', 'daily_loss', 'session_reminder');

-- CreateEnum
CREATE TYPE "ExclusionSource" AS ENUM ('player', 'admin');

-- CreateTable
CREATE TABLE "player_limits" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "LimitKind" NOT NULL,
    "value" BIGINT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "player_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "self_exclusions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "until" TIMESTAMPTZ,
    "reason" TEXT,
    "source" "ExclusionSource" NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "self_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_limits_user_id_kind_key" ON "player_limits"("user_id", "kind");

-- CreateIndex
CREATE INDEX "self_exclusions_user_id_created_at_idx" ON "self_exclusions"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "player_limits" ADD CONSTRAINT "player_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "self_exclusions" ADD CONSTRAINT "self_exclusions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
