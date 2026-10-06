-- Phase 7: demand marketplace (requirements + leads)

CREATE TYPE "RequirementTransactionType" AS ENUM ('BUY', 'RENT');
CREATE TYPE "RequirementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'FULFILLED', 'CLOSED', 'CANCELLED');
CREATE TYPE "RequirementVisibility" AS ENUM ('PRIVATE', 'MARKETPLACE');
CREATE TYPE "RequirementPurpose" AS ENUM ('END_USE', 'INVESTMENT', 'BOTH');
CREATE TYPE "RequirementTimeline" AS ENUM ('IMMEDIATE', 'WITHIN_3_MONTHS', 'WITHIN_6_MONTHS', 'WITHIN_1_YEAR', 'FLEXIBLE');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'ASSIGNED', 'VIEWED', 'CONTACTED', 'QUALIFIED', 'SITE_VISIT', 'NEGOTIATION', 'BOOKED', 'CLOSED', 'LOST');
CREATE TYPE "LeadSource" AS ENUM ('REQUIREMENT_MARKETPLACE');
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

CREATE SEQUENCE IF NOT EXISTS public_id_req_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_lead_seq;

CREATE TABLE "requirements" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "property_type" "PropertyType" NOT NULL,
    "transaction_type" "RequirementTransactionType" NOT NULL,
    "configuration" "PropertyConfiguration",
    "bedrooms" INTEGER,
    "budget_min_minor" BIGINT,
    "budget_max_minor" BIGINT,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "city" VARCHAR(80) NOT NULL,
    "locality" VARCHAR(120),
    "micro_market" VARCHAR(120),
    "preferred_project" VARCHAR(160),
    "purpose" "RequirementPurpose" NOT NULL DEFAULT 'END_USE',
    "timeline" "RequirementTimeline" NOT NULL DEFAULT 'FLEXIBLE',
    "vaastu_required" BOOLEAN NOT NULL DEFAULT false,
    "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "notes" VARCHAR(2000),
    "status" "RequirementStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "RequirementVisibility" NOT NULL DEFAULT 'PRIVATE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "requirements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "requirement_id" UUID NOT NULL,
    "recipient_organization_id" UUID NOT NULL,
    "recipient_user_id" UUID,
    "matched_property_id" UUID,
    "matched_project_id" UUID,
    "match_score" INTEGER NOT NULL,
    "matched_criteria" JSONB NOT NULL,
    "unmatched_criteria" JSONB NOT NULL,
    "match_explanation" VARCHAR(1000) NOT NULL,
    "source" "LeadSource" NOT NULL DEFAULT 'REQUIREMENT_MARKETPLACE',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "priority" "LeadPriority" NOT NULL DEFAULT 'NORMAL',
    "assigned_at" TIMESTAMPTZ(3),
    "first_viewed_at" TIMESTAMPTZ(3),
    "contacted_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "requirements_public_id_key" ON "requirements"("public_id");
CREATE INDEX "requirements_owner_user_id_idx" ON "requirements"("owner_user_id");
CREATE INDEX "requirements_status_idx" ON "requirements"("status");
CREATE INDEX "requirements_visibility_idx" ON "requirements"("visibility");
CREATE INDEX "requirements_status_visibility_idx" ON "requirements"("status", "visibility");
CREATE INDEX "requirements_city_idx" ON "requirements"("city");
CREATE INDEX "requirements_locality_idx" ON "requirements"("locality");
CREATE INDEX "requirements_micro_market_idx" ON "requirements"("micro_market");
CREATE INDEX "requirements_property_type_idx" ON "requirements"("property_type");
CREATE INDEX "requirements_transaction_type_idx" ON "requirements"("transaction_type");
CREATE INDEX "requirements_configuration_idx" ON "requirements"("configuration");
CREATE INDEX "requirements_bedrooms_idx" ON "requirements"("bedrooms");
CREATE INDEX "requirements_budget_min_minor_idx" ON "requirements"("budget_min_minor");
CREATE INDEX "requirements_budget_max_minor_idx" ON "requirements"("budget_max_minor");
CREATE INDEX "requirements_created_at_idx" ON "requirements"("created_at");

CREATE UNIQUE INDEX "leads_public_id_key" ON "leads"("public_id");
CREATE UNIQUE INDEX "leads_requirement_id_recipient_organization_id_key" ON "leads"("requirement_id", "recipient_organization_id");
CREATE INDEX "leads_recipient_organization_id_idx" ON "leads"("recipient_organization_id");
CREATE INDEX "leads_recipient_user_id_idx" ON "leads"("recipient_user_id");
CREATE INDEX "leads_status_idx" ON "leads"("status");
CREATE INDEX "leads_source_idx" ON "leads"("source");
CREATE INDEX "leads_match_score_idx" ON "leads"("match_score");
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");
CREATE INDEX "leads_matched_property_id_idx" ON "leads"("matched_property_id");
CREATE INDEX "leads_matched_project_id_idx" ON "leads"("matched_project_id");

ALTER TABLE "requirements" ADD CONSTRAINT "requirements_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_recipient_organization_id_fkey" FOREIGN KEY ("recipient_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_matched_property_id_fkey" FOREIGN KEY ("matched_property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_matched_project_id_fkey" FOREIGN KEY ("matched_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
