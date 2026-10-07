-- Phase 15B: Agent verification & professional operations (additive)

CREATE TYPE "ProcessingFeeStatus" AS ENUM (
  'NOT_APPLICABLE',
  'REQUIRED',
  'PENDING',
  'PAID',
  'FAILED',
  'WAIVED'
);

ALTER TYPE "AgencyVerificationStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "AgencyVerificationStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

ALTER TYPE "EntitlementKey" ADD VALUE IF NOT EXISTS 'AGENT_PROFESSIONAL';

ALTER TYPE "FinancialTransactionType" ADD VALUE IF NOT EXISTS 'AGENT_VERIFICATION_FEE';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VERIFICATION_SUSPENDED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VERIFICATION_REINSTATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VERIFICATION_PAYMENT_RECEIVED';

ALTER TABLE "agency_profiles"
  ADD COLUMN IF NOT EXISTS "property_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "configurations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "price_range_min_minor" BIGINT,
  ADD COLUMN IF NOT EXISTS "price_range_max_minor" BIGINT,
  ADD COLUMN IF NOT EXISTS "rera_number" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "verification_expires_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "suspended_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "suspension_reason" VARCHAR(1000);

CREATE INDEX IF NOT EXISTS "agency_profiles_verification_expires_at_idx"
  ON "agency_profiles"("verification_expires_at");

ALTER TABLE "verification_cases"
  ADD COLUMN IF NOT EXISTS "processing_fee_status" "ProcessingFeeStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN IF NOT EXISTS "processing_fee_transaction_id" UUID;

CREATE INDEX IF NOT EXISTS "verification_cases_processing_fee_status_idx"
  ON "verification_cases"("processing_fee_status");

CREATE INDEX IF NOT EXISTS "verification_cases_processing_fee_transaction_id_idx"
  ON "verification_cases"("processing_fee_transaction_id");

ALTER TABLE "verification_cases"
  ADD CONSTRAINT "verification_cases_processing_fee_transaction_id_fkey"
  FOREIGN KEY ("processing_fee_transaction_id") REFERENCES "financial_transactions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
