-- Phase 10: Trust, verification, reviews, notifications, communications

ALTER TYPE "CatalogEntityType" ADD VALUE IF NOT EXISTS 'VERIFICATION_CASE';

CREATE TYPE "TrustSubjectStatus" AS ENUM ('UNVERIFIED', 'PENDING_VERIFICATION', 'VERIFIED', 'FLAGGED', 'REVOKED');
CREATE TYPE "VerificationCaseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'EXPIRED', 'REVOKED');
CREATE TYPE "VerificationSubjectType" AS ENUM ('AGENT', 'DEVELOPER', 'PROJECT', 'PROPERTY');
CREATE TYPE "VerificationDocumentType" AS ENUM ('RERA_CERTIFICATE', 'GOVERNMENT_ID', 'COMPANY_REGISTRATION', 'AUTHORIZATION_LETTER', 'PROJECT_APPROVAL', 'OWNERSHIP_DOCUMENT', 'PROPERTY_DOCUMENT', 'OTHER');
CREATE TYPE "VerificationDocumentStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'REPLACEMENT_REQUIRED');
CREATE TYPE "ReviewSubjectType" AS ENUM ('PROJECT', 'PROPERTY', 'DEVELOPER', 'AGENT');
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'HIDDEN', 'REJECTED', 'FLAGGED');
CREATE TYPE "ReviewDimension" AS ENUM ('EXECUTION', 'CONSTRUCTION_QUALITY', 'DOCUMENTATION', 'TIMELINE', 'AMENITIES', 'LOCATION', 'OVERALL');
CREATE TYPE "ReviewReportReason" AS ENUM ('SPAM', 'ABUSE', 'FALSE_INFORMATION', 'PERSONAL_INFORMATION', 'DUPLICATE', 'HARASSMENT', 'OTHER');
CREATE TYPE "NotificationType" AS ENUM ('VERIFICATION_SUBMITTED', 'VERIFICATION_APPROVED', 'VERIFICATION_REJECTED', 'VERIFICATION_CHANGES_REQUESTED', 'VERIFICATION_EXPIRING', 'NEW_LEAD', 'LEAD_ASSIGNED', 'LEAD_PURCHASED', 'SITE_VISIT_CREATED', 'SITE_VISIT_UPDATED', 'REVIEW_PUBLISHED', 'REVIEW_REPORTED', 'MESSAGE_RECEIVED', 'SYSTEM');
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'WHATSAPP', 'SMS');
CREATE TYPE "ConversationType" AS ENUM ('LEAD', 'PROPERTY', 'PROJECT', 'GENERAL');
CREATE TYPE "LeadAccessState" AS ENUM ('PURCHASED', 'ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "ContentReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

CREATE SEQUENCE IF NOT EXISTS public_id_vcase_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_vdoc_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_rev_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_rrpt_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_ntf_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_conv_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_msg_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_lacc_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_crpt_seq;

ALTER TABLE "developer_profiles" ADD COLUMN IF NOT EXISTS "verification_status" "AgencyVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';
CREATE INDEX IF NOT EXISTS "developer_profiles_verification_status_idx" ON "developer_profiles"("verification_status");

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "trust_status" "TrustSubjectStatus" NOT NULL DEFAULT 'UNVERIFIED';
CREATE INDEX IF NOT EXISTS "projects_trust_status_idx" ON "projects"("trust_status");

ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "trust_status" "TrustSubjectStatus" NOT NULL DEFAULT 'UNVERIFIED';
CREATE INDEX IF NOT EXISTS "properties_trust_status_idx" ON "properties"("trust_status");

CREATE TABLE "verification_cases" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID,
    "subject_type" "VerificationSubjectType" NOT NULL,
    "subject_id" UUID NOT NULL,
    "verification_type" "VerificationSubjectType" NOT NULL,
    "status" "VerificationCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "rera_number" VARCHAR(64),
    "declaration_accepted" BOOLEAN NOT NULL DEFAULT false,
    "submitted_by_user_id" UUID,
    "reviewed_by_user_id" UUID,
    "submitted_at" TIMESTAMPTZ(3),
    "reviewed_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3),
    "rejection_reason" VARCHAR(1000),
    "reviewer_notes" VARCHAR(2000),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "verification_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification_documents" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "verification_case_id" UUID NOT NULL,
    "document_asset_id" UUID NOT NULL,
    "document_type" "VerificationDocumentType" NOT NULL,
    "status" "VerificationDocumentStatus" NOT NULL DEFAULT 'SUBMITTED',
    "extracted_reference" VARCHAR(160),
    "reviewer_notes" VARCHAR(1000),
    "uploaded_by_user_id" UUID NOT NULL,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "verification_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "author_user_id" UUID NOT NULL,
    "organization_id" UUID,
    "subject_type" "ReviewSubjectType" NOT NULL,
    "subject_id" UUID NOT NULL,
    "title" VARCHAR(200),
    "body" VARCHAR(4000) NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "overall_rating" INTEGER NOT NULL,
    "eligibility_basis" VARCHAR(64) NOT NULL,
    "published_at" TIMESTAMPTZ(3),
    "moderated_at" TIMESTAMPTZ(3),
    "moderated_by_user_id" UUID,
    "moderator_notes" VARCHAR(1000),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "review_ratings" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "dimension" "ReviewDimension" NOT NULL,
    "rating" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_ratings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "review_reports" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "review_id" UUID NOT NULL,
    "reporter_user_id" UUID NOT NULL,
    "reason" "ReviewReportReason" NOT NULL,
    "details" VARCHAR(1000),
    "status" "ContentReportStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "review_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "user_id" UUID NOT NULL,
    "organization_id" UUID,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "read_at" TIMESTAMPTZ(3),
    "entity_type" VARCHAR(64),
    "entity_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID,
    "type" "ConversationType" NOT NULL,
    "lead_id" UUID,
    "subject_label" VARCHAR(200),
    "status" VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversation_participants" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_at" TIMESTAMPTZ(3),
    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_user_id" UUID NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lead_access_grants" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "lead_purchase_id" UUID,
    "requesting_user_id" UUID NOT NULL,
    "access_state" "LeadAccessState" NOT NULL DEFAULT 'PURCHASED',
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "last_revealed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "lead_access_grants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_reports" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "reporter_user_id" UUID NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" UUID NOT NULL,
    "reason" "ReviewReportReason" NOT NULL,
    "details" VARCHAR(1000),
    "status" "ContentReportStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "verification_cases_public_id_key" ON "verification_cases"("public_id");
CREATE INDEX "verification_cases_organization_id_idx" ON "verification_cases"("organization_id");
CREATE INDEX "verification_cases_subject_type_subject_id_idx" ON "verification_cases"("subject_type", "subject_id");
CREATE INDEX "verification_cases_subject_type_subject_id_verification_type_idx" ON "verification_cases"("subject_type", "subject_id", "verification_type");
CREATE INDEX "verification_cases_status_idx" ON "verification_cases"("status");
CREATE INDEX "verification_cases_submitted_at_idx" ON "verification_cases"("submitted_at");
CREATE INDEX "verification_cases_expires_at_idx" ON "verification_cases"("expires_at");
CREATE UNIQUE INDEX "verification_cases_one_open_per_subject"
  ON "verification_cases"("subject_type", "subject_id", "verification_type")
  WHERE "status" IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED');

CREATE UNIQUE INDEX "verification_documents_public_id_key" ON "verification_documents"("public_id");
CREATE INDEX "verification_documents_verification_case_id_idx" ON "verification_documents"("verification_case_id");
CREATE INDEX "verification_documents_document_asset_id_idx" ON "verification_documents"("document_asset_id");
CREATE INDEX "verification_documents_status_idx" ON "verification_documents"("status");

CREATE UNIQUE INDEX "reviews_public_id_key" ON "reviews"("public_id");
CREATE UNIQUE INDEX "reviews_author_user_id_subject_type_subject_id_key" ON "reviews"("author_user_id", "subject_type", "subject_id");
CREATE INDEX "reviews_organization_id_idx" ON "reviews"("organization_id");
CREATE INDEX "reviews_subject_type_subject_id_idx" ON "reviews"("subject_type", "subject_id");
CREATE INDEX "reviews_status_idx" ON "reviews"("status");
CREATE INDEX "reviews_published_at_idx" ON "reviews"("published_at");

CREATE UNIQUE INDEX "review_ratings_review_id_dimension_key" ON "review_ratings"("review_id", "dimension");
CREATE INDEX "review_ratings_dimension_idx" ON "review_ratings"("dimension");

CREATE UNIQUE INDEX "review_reports_public_id_key" ON "review_reports"("public_id");
CREATE UNIQUE INDEX "review_reports_review_id_reporter_user_id_key" ON "review_reports"("review_id", "reporter_user_id");
CREATE INDEX "review_reports_status_idx" ON "review_reports"("status");

CREATE UNIQUE INDEX "notifications_public_id_key" ON "notifications"("public_id");
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");
CREATE INDEX "notifications_organization_id_idx" ON "notifications"("organization_id");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

CREATE UNIQUE INDEX "notification_preferences_user_id_type_channel_key" ON "notification_preferences"("user_id", "type", "channel");
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences"("user_id");

CREATE UNIQUE INDEX "conversations_public_id_key" ON "conversations"("public_id");
CREATE INDEX "conversations_organization_id_idx" ON "conversations"("organization_id");
CREATE INDEX "conversations_lead_id_idx" ON "conversations"("lead_id");
CREATE INDEX "conversations_type_idx" ON "conversations"("type");
CREATE INDEX "conversations_updated_at_idx" ON "conversations"("updated_at");

CREATE UNIQUE INDEX "conversation_participants_conversation_id_user_id_key" ON "conversation_participants"("conversation_id", "user_id");
CREATE INDEX "conversation_participants_user_id_idx" ON "conversation_participants"("user_id");

CREATE UNIQUE INDEX "messages_public_id_key" ON "messages"("public_id");
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");
CREATE INDEX "messages_sender_user_id_idx" ON "messages"("sender_user_id");

CREATE UNIQUE INDEX "lead_access_grants_public_id_key" ON "lead_access_grants"("public_id");
CREATE UNIQUE INDEX "lead_access_grants_organization_id_lead_id_key" ON "lead_access_grants"("organization_id", "lead_id");
CREATE INDEX "lead_access_grants_lead_id_idx" ON "lead_access_grants"("lead_id");
CREATE INDEX "lead_access_grants_access_state_idx" ON "lead_access_grants"("access_state");
CREATE INDEX "lead_access_grants_requesting_user_id_idx" ON "lead_access_grants"("requesting_user_id");

CREATE UNIQUE INDEX "content_reports_public_id_key" ON "content_reports"("public_id");
CREATE INDEX "content_reports_status_idx" ON "content_reports"("status");
CREATE INDEX "content_reports_entity_type_entity_id_idx" ON "content_reports"("entity_type", "entity_id");

ALTER TABLE "verification_cases" ADD CONSTRAINT "verification_cases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "verification_cases" ADD CONSTRAINT "verification_cases_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "verification_cases" ADD CONSTRAINT "verification_cases_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_verification_case_id_fkey" FOREIGN KEY ("verification_case_id") REFERENCES "verification_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_document_asset_id_fkey" FOREIGN KEY ("document_asset_id") REFERENCES "document_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_user_id_fkey" FOREIGN KEY ("moderated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "review_ratings" ADD CONSTRAINT "review_ratings_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_access_grants" ADD CONSTRAINT "lead_access_grants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_access_grants" ADD CONSTRAINT "lead_access_grants_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lead_access_grants" ADD CONSTRAINT "lead_access_grants_requesting_user_id_fkey" FOREIGN KEY ("requesting_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
