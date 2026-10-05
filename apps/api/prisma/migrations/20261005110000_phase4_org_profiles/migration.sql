-- Phase 4: developer and agency organization profiles.
-- No properties, projects, communities, leads, payments, or CRM.

CREATE SEQUENCE IF NOT EXISTS public_id_dev_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public_id_agt_seq START 1;

CREATE TYPE "ProfileStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "AgencyVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED');

CREATE TABLE "developer_profiles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "legal_name" VARCHAR(160) NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000),
    "logo_object_key" VARCHAR(512),
    "website" VARCHAR(320),
    "contact_email" CITEXT,
    "contact_phone" VARCHAR(32),
    "headquarters_city" VARCHAR(80),
    "headquarters_state" VARCHAR(80),
    "operating_zones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "ProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "developer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "developer_profiles_organization_id_key" ON "developer_profiles"("organization_id");
CREATE UNIQUE INDEX "developer_profiles_public_id_key" ON "developer_profiles"("public_id");
CREATE INDEX "developer_profiles_status_idx" ON "developer_profiles"("status");

ALTER TABLE "developer_profiles"
  ADD CONSTRAINT "developer_profiles_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "agency_profiles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "legal_name" VARCHAR(160) NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000),
    "logo_object_key" VARCHAR(512),
    "website" VARCHAR(320),
    "contact_email" CITEXT,
    "contact_phone" VARCHAR(32),
    "headquarters_city" VARCHAR(80),
    "headquarters_state" VARCHAR(80),
    "operating_zones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "specialization" VARCHAR(160),
    "verification_status" "AgencyVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "status" "ProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "agency_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agency_profiles_organization_id_key" ON "agency_profiles"("organization_id");
CREATE UNIQUE INDEX "agency_profiles_public_id_key" ON "agency_profiles"("public_id");
CREATE INDEX "agency_profiles_status_idx" ON "agency_profiles"("status");
CREATE INDEX "agency_profiles_verification_status_idx" ON "agency_profiles"("verification_status");

ALTER TABLE "agency_profiles"
  ADD CONSTRAINT "agency_profiles_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
