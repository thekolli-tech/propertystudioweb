-- Phase 11: Property Intelligence, Market Intelligence & AI Foundation

CREATE TYPE "IntelligenceSubjectType" AS ENUM ('PROPERTY', 'PROJECT', 'LOCALITY', 'CITY', 'MICRO_MARKET');
CREATE TYPE "IntelligenceDataState" AS ENUM ('READY', 'INSUFFICIENT_DATA', 'UNAVAILABLE');
CREATE TYPE "IntelligenceSourceType" AS ENUM ('INTERNAL_CATALOG', 'MANUAL_ADMIN', 'EXTERNAL_PROVIDER', 'MARKET_OBSERVATION', 'DERIVED');
CREATE TYPE "InfrastructureCategory" AS ENUM ('ROAD', 'METRO', 'AIRPORT', 'HOSPITAL', 'SCHOOL', 'SHOPPING', 'IT_PARK', 'UPCOMING', 'OTHER');
CREATE TYPE "InfrastructureStatus" AS ENUM ('PLANNED', 'UNDER_CONSTRUCTION', 'OPERATIONAL', 'UNKNOWN');
CREATE TYPE "AiJobType" AS ENUM ('ASSISTANT', 'PROPERTY_MATCH', 'DOCUMENT_ANALYSIS', 'FLOORPLAN_ANALYSIS', 'VALUATION', 'PROPERTY_SEARCH', 'COMPARE');
CREATE TYPE "AiJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "DocumentAnalysisFindingKind" AS ENUM ('EXTRACTED_FACT', 'POTENTIAL_INCONSISTENCY', 'MISSING_INFORMATION', 'MODEL_OBSERVATION');

CREATE SEQUENCE IF NOT EXISTS public_id_msnap_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_infra_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_iobs_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_aijob_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_doca_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_fpa_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_val_seq;

CREATE TABLE "market_snapshots" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID,
    "subject_type" "IntelligenceSubjectType" NOT NULL,
    "subject_key" VARCHAR(160) NOT NULL,
    "property_id" UUID,
    "project_id" UUID,
    "city" VARCHAR(80),
    "locality" VARCHAR(120),
    "micro_market" VARCHAR(120),
    "median_price_minor" BIGINT,
    "median_price_per_sqft_minor" BIGINT,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "inventory_signal" VARCHAR(64),
    "demand_signal" VARCHAR(64),
    "rental_yield_bps" INTEGER,
    "appreciation_bps" INTEGER,
    "coverage_state" "IntelligenceDataState" NOT NULL DEFAULT 'INSUFFICIENT_DATA',
    "source_type" "IntelligenceSourceType" NOT NULL,
    "source_reference" VARCHAR(320),
    "observed_at" TIMESTAMPTZ(3) NOT NULL,
    "effective_at" TIMESTAMPTZ(3),
    "confidence_bps" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    CONSTRAINT "market_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "infrastructure_assets" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "category" "InfrastructureCategory" NOT NULL,
    "status" "InfrastructureStatus" NOT NULL DEFAULT 'UNKNOWN',
    "city" VARCHAR(80),
    "locality" VARCHAR(120),
    "address_line" VARCHAR(320),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "expected_at" DATE,
    "actual_at" DATE,
    "source_type" "IntelligenceSourceType" NOT NULL,
    "source_reference" VARCHAR(320),
    "source_url" VARCHAR(512),
    "last_verified_at" TIMESTAMPTZ(3),
    "confidence_bps" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    CONSTRAINT "infrastructure_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "intelligence_observations" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID,
    "subject_type" "IntelligenceSubjectType" NOT NULL,
    "subject_id" UUID,
    "subject_key" VARCHAR(160) NOT NULL,
    "observation_key" VARCHAR(120) NOT NULL,
    "value_json" JSONB NOT NULL,
    "coverage_state" "IntelligenceDataState" NOT NULL DEFAULT 'INSUFFICIENT_DATA',
    "source_type" "IntelligenceSourceType" NOT NULL,
    "source_reference" VARCHAR(320),
    "observed_at" TIMESTAMPTZ(3) NOT NULL,
    "effective_at" TIMESTAMPTZ(3),
    "confidence_bps" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    CONSTRAINT "intelligence_observations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_jobs" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID,
    "actor_user_id" UUID NOT NULL,
    "type" "AiJobType" NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
    "provider" VARCHAR(64) NOT NULL DEFAULT 'DETERMINISTIC',
    "input_json" JSONB NOT NULL,
    "output_json" JSONB,
    "error_message" VARCHAR(1000),
    "coverage_state" "IntelligenceDataState" NOT NULL DEFAULT 'INSUFFICIENT_DATA',
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_analyses" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "ai_job_id" UUID NOT NULL,
    "document_asset_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
    "findings_json" JSONB,
    "warnings_json" JSONB,
    "coverage_state" "IntelligenceDataState" NOT NULL DEFAULT 'INSUFFICIENT_DATA',
    "disclaimer" VARCHAR(320) NOT NULL DEFAULT 'Informational only. Not legal verification.',
    "analyzed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "document_analyses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "floor_plan_analyses" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "ai_job_id" UUID NOT NULL,
    "document_asset_id" UUID,
    "actor_user_id" UUID NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
    "observations_json" JSONB,
    "uncertainty_notes" VARCHAR(2000),
    "coverage_state" "IntelligenceDataState" NOT NULL DEFAULT 'INSUFFICIENT_DATA',
    "disclaimer" VARCHAR(320) NOT NULL DEFAULT 'Informational observations only. Not architectural certification.',
    "analyzed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "floor_plan_analyses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "valuation_estimates" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "ai_job_id" UUID,
    "organization_id" UUID,
    "actor_user_id" UUID NOT NULL,
    "property_id" UUID,
    "project_id" UUID,
    "coverage_state" "IntelligenceDataState" NOT NULL DEFAULT 'INSUFFICIENT_DATA',
    "low_estimate_minor" BIGINT,
    "high_estimate_minor" BIGINT,
    "midpoint_minor" BIGINT,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "confidence_bps" INTEGER,
    "factors_json" JSONB,
    "comparables_json" JSONB,
    "disclaimer" VARCHAR(320) NOT NULL DEFAULT 'Estimate/range only. Not a guaranteed market value.',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "valuation_estimates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "market_snapshots_public_id_key" ON "market_snapshots"("public_id");
CREATE INDEX "market_snapshots_subject_type_subject_key_idx" ON "market_snapshots"("subject_type", "subject_key");
CREATE INDEX "market_snapshots_city_locality_idx" ON "market_snapshots"("city", "locality");
CREATE INDEX "market_snapshots_micro_market_idx" ON "market_snapshots"("micro_market");
CREATE INDEX "market_snapshots_property_id_idx" ON "market_snapshots"("property_id");
CREATE INDEX "market_snapshots_project_id_idx" ON "market_snapshots"("project_id");
CREATE INDEX "market_snapshots_observed_at_idx" ON "market_snapshots"("observed_at");
CREATE INDEX "market_snapshots_organization_id_idx" ON "market_snapshots"("organization_id");

CREATE UNIQUE INDEX "infrastructure_assets_public_id_key" ON "infrastructure_assets"("public_id");
CREATE INDEX "infrastructure_assets_category_idx" ON "infrastructure_assets"("category");
CREATE INDEX "infrastructure_assets_status_idx" ON "infrastructure_assets"("status");
CREATE INDEX "infrastructure_assets_city_locality_idx" ON "infrastructure_assets"("city", "locality");
CREATE INDEX "infrastructure_assets_organization_id_idx" ON "infrastructure_assets"("organization_id");

CREATE UNIQUE INDEX "intelligence_observations_public_id_key" ON "intelligence_observations"("public_id");
CREATE INDEX "intelligence_observations_subject_type_subject_key_idx" ON "intelligence_observations"("subject_type", "subject_key");
CREATE INDEX "intelligence_observations_subject_type_subject_id_idx" ON "intelligence_observations"("subject_type", "subject_id");
CREATE INDEX "intelligence_observations_observation_key_idx" ON "intelligence_observations"("observation_key");
CREATE INDEX "intelligence_observations_observed_at_idx" ON "intelligence_observations"("observed_at");
CREATE INDEX "intelligence_observations_organization_id_idx" ON "intelligence_observations"("organization_id");

CREATE UNIQUE INDEX "ai_jobs_public_id_key" ON "ai_jobs"("public_id");
CREATE INDEX "ai_jobs_actor_user_id_idx" ON "ai_jobs"("actor_user_id");
CREATE INDEX "ai_jobs_organization_id_idx" ON "ai_jobs"("organization_id");
CREATE INDEX "ai_jobs_type_status_idx" ON "ai_jobs"("type", "status");
CREATE INDEX "ai_jobs_created_at_idx" ON "ai_jobs"("created_at");

CREATE UNIQUE INDEX "document_analyses_public_id_key" ON "document_analyses"("public_id");
CREATE INDEX "document_analyses_ai_job_id_idx" ON "document_analyses"("ai_job_id");
CREATE INDEX "document_analyses_document_asset_id_idx" ON "document_analyses"("document_asset_id");
CREATE INDEX "document_analyses_actor_user_id_idx" ON "document_analyses"("actor_user_id");
CREATE INDEX "document_analyses_status_idx" ON "document_analyses"("status");

CREATE UNIQUE INDEX "floor_plan_analyses_public_id_key" ON "floor_plan_analyses"("public_id");
CREATE INDEX "floor_plan_analyses_ai_job_id_idx" ON "floor_plan_analyses"("ai_job_id");
CREATE INDEX "floor_plan_analyses_document_asset_id_idx" ON "floor_plan_analyses"("document_asset_id");
CREATE INDEX "floor_plan_analyses_actor_user_id_idx" ON "floor_plan_analyses"("actor_user_id");
CREATE INDEX "floor_plan_analyses_status_idx" ON "floor_plan_analyses"("status");

CREATE UNIQUE INDEX "valuation_estimates_public_id_key" ON "valuation_estimates"("public_id");
CREATE INDEX "valuation_estimates_property_id_idx" ON "valuation_estimates"("property_id");
CREATE INDEX "valuation_estimates_project_id_idx" ON "valuation_estimates"("project_id");
CREATE INDEX "valuation_estimates_actor_user_id_idx" ON "valuation_estimates"("actor_user_id");
CREATE INDEX "valuation_estimates_organization_id_idx" ON "valuation_estimates"("organization_id");
CREATE INDEX "valuation_estimates_coverage_state_idx" ON "valuation_estimates"("coverage_state");

ALTER TABLE "market_snapshots" ADD CONSTRAINT "market_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "infrastructure_assets" ADD CONSTRAINT "infrastructure_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "intelligence_observations" ADD CONSTRAINT "intelligence_observations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_analyses" ADD CONSTRAINT "document_analyses_ai_job_id_fkey" FOREIGN KEY ("ai_job_id") REFERENCES "ai_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_analyses" ADD CONSTRAINT "document_analyses_document_asset_id_fkey" FOREIGN KEY ("document_asset_id") REFERENCES "document_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_analyses" ADD CONSTRAINT "document_analyses_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "floor_plan_analyses" ADD CONSTRAINT "floor_plan_analyses_ai_job_id_fkey" FOREIGN KEY ("ai_job_id") REFERENCES "ai_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "floor_plan_analyses" ADD CONSTRAINT "floor_plan_analyses_document_asset_id_fkey" FOREIGN KEY ("document_asset_id") REFERENCES "document_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "floor_plan_analyses" ADD CONSTRAINT "floor_plan_analyses_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "valuation_estimates" ADD CONSTRAINT "valuation_estimates_ai_job_id_fkey" FOREIGN KEY ("ai_job_id") REFERENCES "ai_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "valuation_estimates" ADD CONSTRAINT "valuation_estimates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "valuation_estimates" ADD CONSTRAINT "valuation_estimates_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
