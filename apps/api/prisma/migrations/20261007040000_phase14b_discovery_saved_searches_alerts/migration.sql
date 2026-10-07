-- Phase 14B: Advanced Discovery, Saved Searches & Smart Alerts

CREATE SEQUENCE IF NOT EXISTS public_id_ssearch_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_sprop_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_smatch_seq;

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SAVED_SEARCH_MATCH';

CREATE TYPE "SavedSearchAlertFrequency" AS ENUM ('OFF', 'IMMEDIATE');

CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "criteria" JSONB NOT NULL,
    "alert_frequency" "SavedSearchAlertFrequency" NOT NULL DEFAULT 'OFF',
    "last_alerted_at" TIMESTAMPTZ(3),
    "last_run_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_searches_public_id_key" ON "saved_searches"("public_id");
CREATE INDEX "saved_searches_user_id_deleted_at_idx" ON "saved_searches"("user_id", "deleted_at");
CREATE INDEX "saved_searches_alert_frequency_deleted_at_idx" ON "saved_searches"("alert_frequency", "deleted_at");

ALTER TABLE "saved_searches"
  ADD CONSTRAINT "saved_searches_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "saved_properties" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "user_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "saved_properties_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_properties_public_id_key" ON "saved_properties"("public_id");
CREATE UNIQUE INDEX "saved_properties_user_id_property_id_key" ON "saved_properties"("user_id", "property_id");
CREATE INDEX "saved_properties_user_id_deleted_at_idx" ON "saved_properties"("user_id", "deleted_at");
CREATE INDEX "saved_properties_property_id_idx" ON "saved_properties"("property_id");

ALTER TABLE "saved_properties"
  ADD CONSTRAINT "saved_properties_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_properties"
  ADD CONSTRAINT "saved_properties_property_id_fkey"
  FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "saved_search_matches" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "saved_search_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "matched_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified_at" TIMESTAMPTZ(3),

    CONSTRAINT "saved_search_matches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_search_matches_public_id_key" ON "saved_search_matches"("public_id");
CREATE UNIQUE INDEX "saved_search_matches_saved_search_id_property_id_key" ON "saved_search_matches"("saved_search_id", "property_id");
CREATE INDEX "saved_search_matches_user_id_matched_at_idx" ON "saved_search_matches"("user_id", "matched_at");
CREATE INDEX "saved_search_matches_property_id_idx" ON "saved_search_matches"("property_id");

ALTER TABLE "saved_search_matches"
  ADD CONSTRAINT "saved_search_matches_saved_search_id_fkey"
  FOREIGN KEY ("saved_search_id") REFERENCES "saved_searches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_search_matches"
  ADD CONSTRAINT "saved_search_matches_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_search_matches"
  ADD CONSTRAINT "saved_search_matches_property_id_fkey"
  FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
