-- Phase 15A: Developer & Project Operations
-- Additive: construction phase on projects, construction updates, project claims.

CREATE SEQUENCE IF NOT EXISTS public_id_cupd_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_pclaim_seq;

CREATE TYPE "ConstructionPhase" AS ENUM (
  'NOT_STARTED',
  'FOUNDATION',
  'STRUCTURE',
  'BRICKWORK',
  'ELECTRICAL',
  'PLUMBING',
  'FINISHING',
  'INFRASTRUCTURE',
  'HANDOVER',
  'COMPLETED',
  'OTHER'
);

CREATE TYPE "ConstructionUpdatePublicationStatus" AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED'
);

CREATE TYPE "ProjectClaimStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "construction_phase" "ConstructionPhase" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS "construction_percent" INTEGER;

CREATE INDEX IF NOT EXISTS "projects_construction_phase_idx" ON "projects"("construction_phase");

CREATE TABLE "construction_updates" (
  "id" UUID NOT NULL,
  "public_id" VARCHAR(32) NOT NULL,
  "project_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "author_user_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" VARCHAR(5000),
  "milestone" "ConstructionPhase" NOT NULL DEFAULT 'OTHER',
  "percent_complete" INTEGER,
  "update_date" DATE NOT NULL,
  "publication_status" "ConstructionUpdatePublicationStatus" NOT NULL DEFAULT 'DRAFT',
  "media_public_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "published_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "created_by" UUID,
  "updated_by" UUID,
  "version" INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "construction_updates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "construction_updates_public_id_key" ON "construction_updates"("public_id");
CREATE INDEX "construction_updates_project_id_publication_status_idx"
  ON "construction_updates"("project_id", "publication_status");
CREATE INDEX "construction_updates_organization_id_idx" ON "construction_updates"("organization_id");
CREATE INDEX "construction_updates_update_date_idx" ON "construction_updates"("update_date");
CREATE INDEX "construction_updates_publication_status_idx" ON "construction_updates"("publication_status");

ALTER TABLE "construction_updates"
  ADD CONSTRAINT "construction_updates_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "construction_updates"
  ADD CONSTRAINT "construction_updates_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "construction_updates"
  ADD CONSTRAINT "construction_updates_author_user_id_fkey"
  FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "project_claims" (
  "id" UUID NOT NULL,
  "public_id" VARCHAR(32) NOT NULL,
  "project_id" UUID NOT NULL,
  "claiming_organization_id" UUID NOT NULL,
  "submitted_by_user_id" UUID NOT NULL,
  "verification_case_id" UUID,
  "status" "ProjectClaimStatus" NOT NULL DEFAULT 'DRAFT',
  "justification" VARCHAR(2000) NOT NULL,
  "authorization_notes" VARCHAR(2000),
  "review_notes" VARCHAR(2000),
  "reviewed_by_user_id" UUID,
  "reviewed_at" TIMESTAMPTZ(3),
  "submitted_at" TIMESTAMPTZ(3),
  "approved_at" TIMESTAMPTZ(3),
  "entitlement_checked_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "project_claims_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_claims_public_id_key" ON "project_claims"("public_id");
CREATE INDEX "project_claims_project_id_status_idx" ON "project_claims"("project_id", "status");
CREATE INDEX "project_claims_claiming_organization_id_status_idx"
  ON "project_claims"("claiming_organization_id", "status");
CREATE INDEX "project_claims_status_idx" ON "project_claims"("status");
CREATE INDEX "project_claims_verification_case_id_idx" ON "project_claims"("verification_case_id");

ALTER TABLE "project_claims"
  ADD CONSTRAINT "project_claims_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_claims"
  ADD CONSTRAINT "project_claims_claiming_organization_id_fkey"
  FOREIGN KEY ("claiming_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_claims"
  ADD CONSTRAINT "project_claims_submitted_by_user_id_fkey"
  FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_claims"
  ADD CONSTRAINT "project_claims_reviewed_by_user_id_fkey"
  FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_claims"
  ADD CONSTRAINT "project_claims_verification_case_id_fkey"
  FOREIGN KEY ("verification_case_id") REFERENCES "verification_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
