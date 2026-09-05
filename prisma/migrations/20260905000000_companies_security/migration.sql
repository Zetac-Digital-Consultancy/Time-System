-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PLATFORM_ADMIN';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "mfa_last_step" INTEGER NOT NULL DEFAULT -1,
ADD COLUMN     "mfa_secret" TEXT,
ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "session_version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "baustellen" ADD COLUMN     "company_id" TEXT;

-- AlterTable
ALTER TABLE "timer_segments" ADD COLUMN     "ended_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_tokens_token_hash_key" ON "account_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "account_tokens_user_id_idx" ON "account_tokens"("user_id");

-- CreateIndex
CREATE INDEX "login_attempts_window_start_idx" ON "login_attempts"("window_start");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE INDEX "baustellen_company_id_idx" ON "baustellen"("company_id");

-- Preserve pre-company data in a suspended company pending operator review.
INSERT INTO companies (id, name, status)
SELECT 'legacy-company', 'Bestehende Firma (Zuordnung prüfen)', 'INACTIVE'
WHERE EXISTS (SELECT 1 FROM users) OR EXISTS (SELECT 1 FROM baustellen);
UPDATE users SET company_id = 'legacy-company', session_version = session_version + 1, must_change_password = true;
UPDATE baustellen SET company_id = 'legacy-company';
UPDATE users SET status = 'INACTIVE' WHERE lower(email) IN ('admin@bauunternehmen.de', 'max.mueller@bauunternehmen.de', 'anna.schmidt@bauunternehmen.de', 'thomas.weber@bauunternehmen.de', 'lisa.fischer@bauunternehmen.de', 'michael.hoffmann@bauunternehmen.de');
ALTER TABLE baustellen ALTER COLUMN company_id SET NOT NULL;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_tokens" ADD CONSTRAINT "account_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baustellen" ADD CONSTRAINT "baustellen_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
