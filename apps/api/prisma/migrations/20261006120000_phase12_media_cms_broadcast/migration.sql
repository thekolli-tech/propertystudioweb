-- Phase 12: Media CMS, Creator content, analytics, external providers, Broadcast Studio

CREATE SEQUENCE IF NOT EXISTS public_id_crt_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_edc_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_edcr_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_mcol_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_mcit_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_maev_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_emap_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_bcfg_seq;

-- CreateEnum
CREATE TYPE "MediaLifecycleStatus" AS ENUM ('DRAFT', 'PROCESSING', 'READY', 'PUBLISHED', 'ARCHIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MediaModerationStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FLAGGED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EditorialContentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EditorialContentKind" AS ENUM ('MARKET_ARTICLE', 'PROJECT_ANALYSIS', 'LOCALITY_GUIDE', 'INVESTMENT_EXPLAINER', 'CONSTRUCTION_UPDATE', 'BUILDER_INTERVIEW', 'PROPERTY_WALKTHROUGH', 'LEGAL_EXPLAINER', 'INFRASTRUCTURE_STORY', 'PLATFORM_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "MediaCollectionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MediaCollectionItemKind" AS ENUM ('MEDIA', 'EDITORIAL');

-- CreateEnum
CREATE TYPE "MediaAnalyticsEventType" AS ENUM ('VIEW', 'PLAY', 'COMPLETION', 'CLICK', 'SHARE', 'SAVE', 'ENGAGEMENT');

-- CreateEnum
CREATE TYPE "ExternalMediaProviderKind" AS ENUM ('YOUTUBE', 'VIMEO', 'INSTAGRAM', 'FACEBOOK', 'OTHER');

-- CreateEnum
CREATE TYPE "ExternalMediaProviderStatus" AS ENUM ('UNAVAILABLE', 'CONFIGURED', 'DISABLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MediaType" ADD VALUE 'AUDIO';
ALTER TYPE "MediaType" ADD VALUE 'DOCUMENT';
ALTER TYPE "MediaType" ADD VALUE 'EMBED';

-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN     "author_user_id" UUID,
ADD COLUMN     "canonical_path" VARCHAR(320),
ADD COLUMN     "caption" VARCHAR(500),
ADD COLUMN     "category" VARCHAR(80),
ADD COLUMN     "description" VARCHAR(2000),
ADD COLUMN     "duration_seconds" INTEGER,
ADD COLUMN     "editorial_content_id" UUID,
ADD COLUMN     "height_px" INTEGER,
ADD COLUMN     "indexable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lifecycle_status" "MediaLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "moderation_status" "MediaModerationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
ADD COLUMN     "og_description" VARCHAR(320),
ADD COLUMN     "og_title" VARCHAR(200),
ADD COLUMN     "poster_storage_key" VARCHAR(512),
ADD COLUMN     "published_at" TIMESTAMPTZ(3),
ADD COLUMN     "seo_description" VARCHAR(320),
ADD COLUMN     "seo_title" VARCHAR(200),
ADD COLUMN     "slug" VARCHAR(160),
ADD COLUMN     "source" VARCHAR(80),
ADD COLUMN     "source_url" VARCHAR(1000),
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "thumbnail_storage_key" VARCHAR(512),
ADD COLUMN     "title" VARCHAR(200),
ADD COLUMN     "twitter_description" VARCHAR(320),
ADD COLUMN     "twitter_title" VARCHAR(200),
ADD COLUMN     "width_px" INTEGER,
ALTER COLUMN "organization_id" DROP NOT NULL,
ALTER COLUMN "entity_type" DROP NOT NULL,
ALTER COLUMN "entity_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "creator_profiles" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "user_id" UUID NOT NULL,
    "organization_id" UUID,
    "display_name" VARCHAR(120) NOT NULL,
    "bio" VARCHAR(1000),
    "headline" VARCHAR(200),
    "avatar_key" VARCHAR(512),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editorial_contents" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID,
    "kind" "EditorialContentKind" NOT NULL,
    "status" "EditorialContentStatus" NOT NULL DEFAULT 'DRAFT',
    "title" VARCHAR(240) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "excerpt" VARCHAR(500),
    "body_markdown" TEXT NOT NULL,
    "author_user_id" UUID NOT NULL,
    "cover_media_id" UUID,
    "category" VARCHAR(80),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "related_property_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "related_project_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "related_localities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published_at" TIMESTAMPTZ(3),
    "scheduled_at" TIMESTAMPTZ(3),
    "seo_title" VARCHAR(200),
    "seo_description" VARCHAR(320),
    "canonical_path" VARCHAR(320),
    "og_title" VARCHAR(200),
    "og_description" VARCHAR(320),
    "twitter_title" VARCHAR(200),
    "twitter_description" VARCHAR(320),
    "indexable" BOOLEAN NOT NULL DEFAULT false,
    "moderation_status" "MediaModerationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "editorial_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editorial_content_revisions" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "editorial_content_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "excerpt" VARCHAR(500),
    "body_markdown" TEXT NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "editorial_content_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_collections" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID,
    "owner_user_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "description" VARCHAR(2000),
    "cover_media_id" UUID,
    "visibility" "AssetVisibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "MediaCollectionStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(3),
    "category" VARCHAR(80),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seo_title" VARCHAR(200),
    "seo_description" VARCHAR(320),
    "indexable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "media_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_collection_items" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "collection_id" UUID NOT NULL,
    "item_kind" "MediaCollectionItemKind" NOT NULL,
    "media_asset_id" UUID,
    "editorial_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "media_collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_analytics_events" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID,
    "event_type" "MediaAnalyticsEventType" NOT NULL,
    "media_asset_id" UUID,
    "editorial_id" UUID,
    "collection_id" UUID,
    "actor_user_id" UUID,
    "session_key" VARCHAR(64),
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_media_mappings" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID,
    "media_asset_id" UUID NOT NULL,
    "provider" "ExternalMediaProviderKind" NOT NULL,
    "provider_status" "ExternalMediaProviderStatus" NOT NULL DEFAULT 'UNAVAILABLE',
    "external_media_id" VARCHAR(160),
    "external_url" VARCHAR(1000),
    "last_synced_at" TIMESTAMPTZ(3),
    "last_metrics_json" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "external_media_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_studio_configs" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID,
    "name" VARCHAR(120) NOT NULL DEFAULT 'Property Studio Broadcast',
    "default_home_route" VARCHAR(120) NOT NULL DEFAULT '/studio',
    "touch_target_min_px" INTEGER NOT NULL DEFAULT 56,
    "enabled_sections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "broadcast_studio_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_public_id_key" ON "creator_profiles"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_user_id_key" ON "creator_profiles"("user_id");

-- CreateIndex
CREATE INDEX "creator_profiles_organization_id_idx" ON "creator_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "creator_profiles_is_active_idx" ON "creator_profiles"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "editorial_contents_public_id_key" ON "editorial_contents"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "editorial_contents_slug_key" ON "editorial_contents"("slug");

-- CreateIndex
CREATE INDEX "editorial_contents_organization_id_idx" ON "editorial_contents"("organization_id");

-- CreateIndex
CREATE INDEX "editorial_contents_status_idx" ON "editorial_contents"("status");

-- CreateIndex
CREATE INDEX "editorial_contents_kind_idx" ON "editorial_contents"("kind");

-- CreateIndex
CREATE INDEX "editorial_contents_author_user_id_idx" ON "editorial_contents"("author_user_id");

-- CreateIndex
CREATE INDEX "editorial_contents_published_at_idx" ON "editorial_contents"("published_at");

-- CreateIndex
CREATE INDEX "editorial_contents_featured_idx" ON "editorial_contents"("featured");

-- CreateIndex
CREATE INDEX "editorial_contents_moderation_status_idx" ON "editorial_contents"("moderation_status");

-- CreateIndex
CREATE INDEX "editorial_contents_deleted_at_idx" ON "editorial_contents"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "editorial_content_revisions_public_id_key" ON "editorial_content_revisions"("public_id");

-- CreateIndex
CREATE INDEX "editorial_content_revisions_editorial_content_id_idx" ON "editorial_content_revisions"("editorial_content_id");

-- CreateIndex
CREATE UNIQUE INDEX "editorial_content_revisions_editorial_content_id_revision_n_key" ON "editorial_content_revisions"("editorial_content_id", "revision_number");

-- CreateIndex
CREATE UNIQUE INDEX "media_collections_public_id_key" ON "media_collections"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_collections_slug_key" ON "media_collections"("slug");

-- CreateIndex
CREATE INDEX "media_collections_organization_id_idx" ON "media_collections"("organization_id");

-- CreateIndex
CREATE INDEX "media_collections_owner_user_id_idx" ON "media_collections"("owner_user_id");

-- CreateIndex
CREATE INDEX "media_collections_status_idx" ON "media_collections"("status");

-- CreateIndex
CREATE INDEX "media_collections_visibility_idx" ON "media_collections"("visibility");

-- CreateIndex
CREATE INDEX "media_collections_deleted_at_idx" ON "media_collections"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "media_collection_items_public_id_key" ON "media_collection_items"("public_id");

-- CreateIndex
CREATE INDEX "media_collection_items_collection_id_sort_order_idx" ON "media_collection_items"("collection_id", "sort_order");

-- CreateIndex
CREATE INDEX "media_collection_items_media_asset_id_idx" ON "media_collection_items"("media_asset_id");

-- CreateIndex
CREATE INDEX "media_collection_items_editorial_id_idx" ON "media_collection_items"("editorial_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_collection_items_collection_id_media_asset_id_key" ON "media_collection_items"("collection_id", "media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_collection_items_collection_id_editorial_id_key" ON "media_collection_items"("collection_id", "editorial_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_analytics_events_public_id_key" ON "media_analytics_events"("public_id");

-- CreateIndex
CREATE INDEX "media_analytics_events_organization_id_idx" ON "media_analytics_events"("organization_id");

-- CreateIndex
CREATE INDEX "media_analytics_events_event_type_idx" ON "media_analytics_events"("event_type");

-- CreateIndex
CREATE INDEX "media_analytics_events_media_asset_id_idx" ON "media_analytics_events"("media_asset_id");

-- CreateIndex
CREATE INDEX "media_analytics_events_editorial_id_idx" ON "media_analytics_events"("editorial_id");

-- CreateIndex
CREATE INDEX "media_analytics_events_collection_id_idx" ON "media_analytics_events"("collection_id");

-- CreateIndex
CREATE INDEX "media_analytics_events_occurred_at_idx" ON "media_analytics_events"("occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "external_media_mappings_public_id_key" ON "external_media_mappings"("public_id");

-- CreateIndex
CREATE INDEX "external_media_mappings_media_asset_id_idx" ON "external_media_mappings"("media_asset_id");

-- CreateIndex
CREATE INDEX "external_media_mappings_organization_id_idx" ON "external_media_mappings"("organization_id");

-- CreateIndex
CREATE INDEX "external_media_mappings_provider_status_idx" ON "external_media_mappings"("provider_status");

-- CreateIndex
CREATE UNIQUE INDEX "external_media_mappings_provider_external_media_id_key" ON "external_media_mappings"("provider", "external_media_id");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_studio_configs_public_id_key" ON "broadcast_studio_configs"("public_id");

-- CreateIndex
CREATE INDEX "broadcast_studio_configs_organization_id_idx" ON "broadcast_studio_configs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_slug_key" ON "media_assets"("slug");

-- CreateIndex
CREATE INDEX "media_assets_lifecycle_status_idx" ON "media_assets"("lifecycle_status");

-- CreateIndex
CREATE INDEX "media_assets_moderation_status_idx" ON "media_assets"("moderation_status");

-- CreateIndex
CREATE INDEX "media_assets_slug_idx" ON "media_assets"("slug");

-- CreateIndex
CREATE INDEX "media_assets_author_user_id_idx" ON "media_assets"("author_user_id");

-- CreateIndex
CREATE INDEX "media_assets_editorial_content_id_idx" ON "media_assets"("editorial_content_id");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_editorial_content_id_fkey" FOREIGN KEY ("editorial_content_id") REFERENCES "editorial_contents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_contents" ADD CONSTRAINT "editorial_contents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_contents" ADD CONSTRAINT "editorial_contents_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_contents" ADD CONSTRAINT "editorial_contents_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_content_revisions" ADD CONSTRAINT "editorial_content_revisions_editorial_content_id_fkey" FOREIGN KEY ("editorial_content_id") REFERENCES "editorial_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_collections" ADD CONSTRAINT "media_collections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_collections" ADD CONSTRAINT "media_collections_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_collections" ADD CONSTRAINT "media_collections_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_collection_items" ADD CONSTRAINT "media_collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "media_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_collection_items" ADD CONSTRAINT "media_collection_items_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_collection_items" ADD CONSTRAINT "media_collection_items_editorial_id_fkey" FOREIGN KEY ("editorial_id") REFERENCES "editorial_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_analytics_events" ADD CONSTRAINT "media_analytics_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_analytics_events" ADD CONSTRAINT "media_analytics_events_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_analytics_events" ADD CONSTRAINT "media_analytics_events_editorial_id_fkey" FOREIGN KEY ("editorial_id") REFERENCES "editorial_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_media_mappings" ADD CONSTRAINT "external_media_mappings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_media_mappings" ADD CONSTRAINT "external_media_mappings_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "verification_cases_subject_type_subject_id_verification_type_id" RENAME TO "verification_cases_subject_type_subject_id_verification_typ_idx";
