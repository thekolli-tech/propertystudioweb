-- Phase 5: property & project catalog foundation

CREATE TYPE "ProjectType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE', 'PLOTTED', 'OTHER');
CREATE TYPE "ProjectLifecycleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'VILLA', 'PLOT', 'OFFICE', 'SHOP', 'WAREHOUSE', 'OTHER');
CREATE TYPE "ListingType" AS ENUM ('SALE', 'RENT');
CREATE TYPE "PropertyConfiguration" AS ENUM ('STUDIO', 'ONE_BHK', 'TWO_BHK', 'THREE_BHK', 'FOUR_BHK', 'FIVE_BHK_PLUS', 'OTHER');
CREATE TYPE "PropertyPublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "PropertyAvailabilityStatus" AS ENUM ('AVAILABLE', 'UNDER_OFFER', 'SOLD', 'UNAVAILABLE');
CREATE TYPE "CommunityStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "CommunityVisibility" AS ENUM ('PRIVATE', 'PUBLIC');
CREATE TYPE "CatalogEntityType" AS ENUM ('PROJECT', 'PROPERTY', 'COMMUNITY');
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'FLOOR_PLAN', 'OTHER');
CREATE TYPE "AssetVisibility" AS ENUM ('PRIVATE', 'PUBLIC');
CREATE TYPE "ResourceAssignmentType" AS ENUM ('PROPERTY', 'PROJECT');

CREATE SEQUENCE IF NOT EXISTS public_id_proj_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_prop_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_com_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_med_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_doc_seq;

CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "description" VARCHAR(5000),
    "project_type" "ProjectType" NOT NULL,
    "lifecycle_status" "ProjectLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "address_line1" VARCHAR(200),
    "address_line2" VARCHAR(200),
    "locality" VARCHAR(120),
    "micro_market" VARCHAR(120),
    "city" VARCHAR(80),
    "state" VARCHAR(80),
    "postal_code" VARCHAR(20),
    "country_code" VARCHAR(2) NOT NULL DEFAULT 'IN',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "total_area_sqft" DECIMAL(14,2),
    "total_units" INTEGER,
    "starting_price_minor" BIGINT,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "possession_date" DATE,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "title" VARCHAR(200) NOT NULL,
    "property_type" "PropertyType" NOT NULL,
    "listing_type" "ListingType" NOT NULL DEFAULT 'SALE',
    "configuration" "PropertyConfiguration",
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "carpet_area_sqft" DECIMAL(12,2),
    "built_up_area_sqft" DECIMAL(12,2),
    "plot_area_sqft" DECIMAL(12,2),
    "floor_number" INTEGER,
    "total_floors" INTEGER,
    "facing" VARCHAR(40),
    "price_minor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "availability_status" "PropertyAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "publication_status" "PropertyPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "description" VARCHAR(5000),
    "address_line1" VARCHAR(200),
    "address_line2" VARCHAR(200),
    "locality" VARCHAR(120),
    "city" VARCHAR(80),
    "state" VARCHAR(80),
    "postal_code" VARCHAR(20),
    "country_code" VARCHAR(2) NOT NULL DEFAULT 'IN',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communities" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(2000),
    "status" "CommunityStatus" NOT NULL DEFAULT 'ACTIVE',
    "visibility" "CommunityVisibility" NOT NULL DEFAULT 'PRIVATE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "entity_type" "CatalogEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "media_type" "MediaType" NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "alt_text" VARCHAR(240),
    "visibility" "AssetVisibility" NOT NULL DEFAULT 'PRIVATE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_assets" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "entity_type" "CatalogEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "document_type" VARCHAR(80) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "visibility" "AssetVisibility" NOT NULL DEFAULT 'PRIVATE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "document_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resource_assignments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "resource_type" "ResourceAssignmentType" NOT NULL,
    "resource_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "resource_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "projects_public_id_key" ON "projects"("public_id");
CREATE UNIQUE INDEX "projects_organization_id_slug_key" ON "projects"("organization_id", "slug");
CREATE INDEX "projects_organization_id_idx" ON "projects"("organization_id");
CREATE INDEX "projects_lifecycle_status_idx" ON "projects"("lifecycle_status");
CREATE INDEX "projects_city_idx" ON "projects"("city");
CREATE INDEX "projects_locality_idx" ON "projects"("locality");
CREATE INDEX "projects_micro_market_idx" ON "projects"("micro_market");
CREATE INDEX "projects_project_type_idx" ON "projects"("project_type");
CREATE INDEX "projects_published_at_idx" ON "projects"("published_at");
CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");

CREATE UNIQUE INDEX "properties_public_id_key" ON "properties"("public_id");
CREATE INDEX "properties_organization_id_idx" ON "properties"("organization_id");
CREATE INDEX "properties_project_id_idx" ON "properties"("project_id");
CREATE INDEX "properties_publication_status_idx" ON "properties"("publication_status");
CREATE INDEX "properties_availability_status_idx" ON "properties"("availability_status");
CREATE INDEX "properties_city_idx" ON "properties"("city");
CREATE INDEX "properties_locality_idx" ON "properties"("locality");
CREATE INDEX "properties_property_type_idx" ON "properties"("property_type");
CREATE INDEX "properties_configuration_idx" ON "properties"("configuration");
CREATE INDEX "properties_bedrooms_idx" ON "properties"("bedrooms");
CREATE INDEX "properties_price_minor_idx" ON "properties"("price_minor");
CREATE INDEX "properties_published_at_idx" ON "properties"("published_at");
CREATE INDEX "properties_deleted_at_idx" ON "properties"("deleted_at");

CREATE UNIQUE INDEX "communities_public_id_key" ON "communities"("public_id");
CREATE INDEX "communities_organization_id_idx" ON "communities"("organization_id");
CREATE INDEX "communities_project_id_idx" ON "communities"("project_id");
CREATE INDEX "communities_status_idx" ON "communities"("status");
CREATE INDEX "communities_visibility_idx" ON "communities"("visibility");
CREATE INDEX "communities_deleted_at_idx" ON "communities"("deleted_at");

CREATE UNIQUE INDEX "media_assets_public_id_key" ON "media_assets"("public_id");
CREATE INDEX "media_assets_organization_id_idx" ON "media_assets"("organization_id");
CREATE INDEX "media_assets_entity_type_entity_id_idx" ON "media_assets"("entity_type", "entity_id");
CREATE INDEX "media_assets_visibility_idx" ON "media_assets"("visibility");
CREATE INDEX "media_assets_deleted_at_idx" ON "media_assets"("deleted_at");

CREATE UNIQUE INDEX "document_assets_public_id_key" ON "document_assets"("public_id");
CREATE INDEX "document_assets_organization_id_idx" ON "document_assets"("organization_id");
CREATE INDEX "document_assets_entity_type_entity_id_idx" ON "document_assets"("entity_type", "entity_id");
CREATE INDEX "document_assets_visibility_idx" ON "document_assets"("visibility");
CREATE INDEX "document_assets_deleted_at_idx" ON "document_assets"("deleted_at");

CREATE UNIQUE INDEX "resource_assignments_user_id_resource_type_resource_id_key" ON "resource_assignments"("user_id", "resource_type", "resource_id");
CREATE INDEX "resource_assignments_user_id_idx" ON "resource_assignments"("user_id");
CREATE INDEX "resource_assignments_organization_id_idx" ON "resource_assignments"("organization_id");
CREATE INDEX "resource_assignments_resource_type_resource_id_idx" ON "resource_assignments"("resource_type", "resource_id");

ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "properties" ADD CONSTRAINT "properties_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "properties" ADD CONSTRAINT "properties_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communities" ADD CONSTRAINT "communities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communities" ADD CONSTRAINT "communities_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_assets" ADD CONSTRAINT "document_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
