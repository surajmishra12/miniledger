-- CreateEnum
CREATE TYPE "IdentifierType" AS ENUM ('PHONE', 'EMAIL');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('LENT', 'BORROWED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'REAUTH');

-- CreateEnum
CREATE TYPE "OtpState" AS ENUM ('PENDING', 'ACTIVE', 'CONSUMED', 'INVALIDATED', 'FAILED');

-- CreateEnum
CREATE TYPE "RevokeReason" AS ENUM ('LOGOUT', 'REPLAY_DETECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "identifier_type" "IdentifierType" NOT NULL,
    "identifier" TEXT NOT NULL,
    "display_name" VARCHAR(60),
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "name_key" TEXT NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "direction" "Direction" NOT NULL,
    "principal_paise" BIGINT NOT NULL,
    "loan_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "note" VARCHAR(500),
    "version" INTEGER NOT NULL DEFAULT 1,
    "last_activity_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repayments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "paid_on" DATE NOT NULL,
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "repayments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" UUID NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "identifier_type" "IdentifierType" NOT NULL,
    "identifier" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "session_id" UUID,
    "code_digest" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "state" "OtpState" NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_digest" TEXT NOT NULL,
    "previous_refresh_token_digest" TEXT,
    "rotated_at" TIMESTAMPTZ(3),
    "refresh_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "absolute_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "revoke_reason" "RevokeReason",
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_identifier_type_identifier_key" ON "users"("identifier_type", "identifier");

-- CreateIndex
CREATE INDEX "people_user_id_archived_at_name_key_id_idx" ON "people"("user_id", "archived_at", "name_key", "id");

-- CreateIndex
CREATE UNIQUE INDEX "people_id_user_id_key" ON "people"("id", "user_id");

-- CreateIndex
CREATE INDEX "loans_user_id_due_date_id_idx" ON "loans"("user_id", "due_date", "id");

-- CreateIndex
CREATE INDEX "loans_user_id_last_activity_at_id_idx" ON "loans"("user_id", "last_activity_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "loans_user_id_person_id_idx" ON "loans"("user_id", "person_id");

-- CreateIndex
CREATE UNIQUE INDEX "loans_id_user_id_key" ON "loans"("id", "user_id");

-- CreateIndex
CREATE INDEX "repayments_loan_id_paid_on_created_at_idx" ON "repayments"("loan_id", "paid_on" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "repayments_user_id_idx" ON "repayments"("user_id");

-- CreateIndex
CREATE INDEX "otp_challenges_identifier_type_identifier_created_at_idx" ON "otp_challenges"("identifier_type", "identifier", "created_at" DESC);

-- CreateIndex
CREATE INDEX "otp_challenges_ip_hash_created_at_idx" ON "otp_challenges"("ip_hash", "created_at" DESC);

-- CreateIndex
CREATE INDEX "otp_challenges_created_at_idx" ON "otp_challenges"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_digest_key" ON "sessions"("refresh_token_digest");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_previous_refresh_token_digest_key" ON "sessions"("previous_refresh_token_digest");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_person_id_user_id_fkey" FOREIGN KEY ("person_id", "user_id") REFERENCES "people"("id", "user_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_loan_id_user_id_fkey" FOREIGN KEY ("loan_id", "user_id") REFERENCES "loans"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- CHECK constraints (architecture.md §4.1). Added by hand: Prisma cannot express them.
-- ---------------------------------------------------------------------------

-- Money: positive and at most ₹1,00,00,000.00 (1,000,000,000 paise).
ALTER TABLE "loans" ADD CONSTRAINT "loans_principal_paise_check"
    CHECK ("principal_paise" > 0 AND "principal_paise" <= 1000000000);
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_amount_paise_check"
    CHECK ("amount_paise" > 0 AND "amount_paise" <= 1000000000);

-- Supported calendar range for every ledger date.
ALTER TABLE "loans" ADD CONSTRAINT "loans_dates_range_check"
    CHECK ("loan_date" BETWEEN DATE '2000-01-01' AND DATE '2099-12-31'
       AND "due_date" BETWEEN DATE '2000-01-01' AND DATE '2099-12-31');
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_paid_on_range_check"
    CHECK ("paid_on" BETWEEN DATE '2000-01-01' AND DATE '2099-12-31');

-- Text limits in code points (varchar enforces the maximum; these enforce non-empty).
ALTER TABLE "people" ADD CONSTRAINT "people_name_not_blank_check" CHECK (char_length("name") >= 1);

-- OTP attempts never exceed the maximum of 5.
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_attempts_check"
    CHECK ("attempts" BETWEEN 0 AND 5);

-- Reauth challenges always belong to a session; login challenges never do.
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_session_purpose_check"
    CHECK (("purpose" = 'REAUTH') = ("session_id" IS NOT NULL));

-- Loan versions start at 1.
ALTER TABLE "loans" ADD CONSTRAINT "loans_version_check" CHECK ("version" >= 1);
