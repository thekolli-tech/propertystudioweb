-- Phase 8: CRM + lead operations

CREATE TYPE "ContactType" AS ENUM ('BUYER', 'INVESTOR', 'REFERRAL', 'OTHER');
CREATE TYPE "ContactStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "PreferredContactMethod" AS ENUM ('PHONE', 'EMAIL', 'WHATSAPP', 'IN_PERSON', 'OTHER');
CREATE TYPE "CrmActivityType" AS ENUM ('NOTE', 'CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'SITE_VISIT', 'STATUS_CHANGE', 'ASSIGNMENT', 'FOLLOW_UP');
CREATE TYPE "FollowUpStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "FollowUpPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "SiteVisitStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "SiteVisitOutcome" AS ENUM ('INTERESTED', 'FOLLOW_UP', 'NEGOTIATION', 'NOT_INTERESTED', 'UNKNOWN');
CREATE TYPE "DealStatus" AS ENUM ('OPEN', 'NEGOTIATION', 'BOOKED', 'CLOSED', 'LOST');

CREATE SEQUENCE IF NOT EXISTS public_id_contact_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_act_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_task_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_visit_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_deal_seq;

CREATE TABLE "crm_contacts" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "source_lead_id" UUID,
    "contact_type" "ContactType" NOT NULL DEFAULT 'BUYER',
    "display_name" VARCHAR(160) NOT NULL,
    "phone" VARCHAR(32),
    "email" CITEXT,
    "preferred_contact_method" "PreferredContactMethod" NOT NULL DEFAULT 'PHONE',
    "notes" VARCHAR(2000),
    "owner_user_id" UUID,
    "status" "ContactStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "crm_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_activities" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "contact_id" UUID,
    "lead_id" UUID,
    "actor_user_id" UUID NOT NULL,
    "activity_type" "CrmActivityType" NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "description" VARCHAR(4000),
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_follow_ups" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "contact_id" UUID,
    "lead_id" UUID,
    "assigned_user_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "due_at" TIMESTAMPTZ(3) NOT NULL,
    "priority" "FollowUpPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "FollowUpStatus" NOT NULL DEFAULT 'OPEN',
    "reminder_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "crm_follow_ups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_site_visits" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "contact_id" UUID,
    "assigned_user_id" UUID,
    "property_id" UUID,
    "project_id" UUID,
    "scheduled_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "SiteVisitStatus" NOT NULL DEFAULT 'SCHEDULED',
    "outcome" "SiteVisitOutcome",
    "notes" VARCHAR(2000),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "crm_site_visits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_deals" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "contact_id" UUID,
    "property_id" UUID,
    "project_id" UUID,
    "status" "DealStatus" NOT NULL DEFAULT 'OPEN',
    "expected_value_minor" BIGINT,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "expected_close_date" DATE,
    "closed_at" TIMESTAMPTZ(3),
    "notes" VARCHAR(2000),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "crm_deals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crm_contacts_public_id_key" ON "crm_contacts"("public_id");
CREATE INDEX "crm_contacts_organization_id_idx" ON "crm_contacts"("organization_id");
CREATE INDEX "crm_contacts_source_lead_id_idx" ON "crm_contacts"("source_lead_id");
CREATE INDEX "crm_contacts_owner_user_id_idx" ON "crm_contacts"("owner_user_id");
CREATE INDEX "crm_contacts_status_idx" ON "crm_contacts"("status");
CREATE INDEX "crm_contacts_email_idx" ON "crm_contacts"("email");
CREATE INDEX "crm_contacts_phone_idx" ON "crm_contacts"("phone");
CREATE INDEX "crm_contacts_created_at_idx" ON "crm_contacts"("created_at");

CREATE UNIQUE INDEX "crm_activities_public_id_key" ON "crm_activities"("public_id");
CREATE INDEX "crm_activities_organization_id_idx" ON "crm_activities"("organization_id");
CREATE INDEX "crm_activities_contact_id_idx" ON "crm_activities"("contact_id");
CREATE INDEX "crm_activities_lead_id_idx" ON "crm_activities"("lead_id");
CREATE INDEX "crm_activities_actor_user_id_idx" ON "crm_activities"("actor_user_id");
CREATE INDEX "crm_activities_activity_type_idx" ON "crm_activities"("activity_type");
CREATE INDEX "crm_activities_occurred_at_idx" ON "crm_activities"("occurred_at");

CREATE UNIQUE INDEX "crm_follow_ups_public_id_key" ON "crm_follow_ups"("public_id");
CREATE INDEX "crm_follow_ups_organization_id_idx" ON "crm_follow_ups"("organization_id");
CREATE INDEX "crm_follow_ups_contact_id_idx" ON "crm_follow_ups"("contact_id");
CREATE INDEX "crm_follow_ups_lead_id_idx" ON "crm_follow_ups"("lead_id");
CREATE INDEX "crm_follow_ups_assigned_user_id_idx" ON "crm_follow_ups"("assigned_user_id");
CREATE INDEX "crm_follow_ups_status_idx" ON "crm_follow_ups"("status");
CREATE INDEX "crm_follow_ups_priority_idx" ON "crm_follow_ups"("priority");
CREATE INDEX "crm_follow_ups_due_at_idx" ON "crm_follow_ups"("due_at");

CREATE UNIQUE INDEX "crm_site_visits_public_id_key" ON "crm_site_visits"("public_id");
CREATE INDEX "crm_site_visits_organization_id_idx" ON "crm_site_visits"("organization_id");
CREATE INDEX "crm_site_visits_lead_id_idx" ON "crm_site_visits"("lead_id");
CREATE INDEX "crm_site_visits_contact_id_idx" ON "crm_site_visits"("contact_id");
CREATE INDEX "crm_site_visits_assigned_user_id_idx" ON "crm_site_visits"("assigned_user_id");
CREATE INDEX "crm_site_visits_property_id_idx" ON "crm_site_visits"("property_id");
CREATE INDEX "crm_site_visits_project_id_idx" ON "crm_site_visits"("project_id");
CREATE INDEX "crm_site_visits_status_idx" ON "crm_site_visits"("status");
CREATE INDEX "crm_site_visits_scheduled_at_idx" ON "crm_site_visits"("scheduled_at");

CREATE UNIQUE INDEX "crm_deals_public_id_key" ON "crm_deals"("public_id");
CREATE INDEX "crm_deals_organization_id_idx" ON "crm_deals"("organization_id");
CREATE INDEX "crm_deals_lead_id_idx" ON "crm_deals"("lead_id");
CREATE INDEX "crm_deals_contact_id_idx" ON "crm_deals"("contact_id");
CREATE INDEX "crm_deals_property_id_idx" ON "crm_deals"("property_id");
CREATE INDEX "crm_deals_project_id_idx" ON "crm_deals"("project_id");
CREATE INDEX "crm_deals_status_idx" ON "crm_deals"("status");
CREATE INDEX "crm_deals_expected_close_date_idx" ON "crm_deals"("expected_close_date");
CREATE INDEX "crm_deals_created_at_idx" ON "crm_deals"("created_at");

ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_source_lead_id_fkey" FOREIGN KEY ("source_lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "crm_follow_ups" ADD CONSTRAINT "crm_follow_ups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_follow_ups" ADD CONSTRAINT "crm_follow_ups_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_follow_ups" ADD CONSTRAINT "crm_follow_ups_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_follow_ups" ADD CONSTRAINT "crm_follow_ups_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_site_visits" ADD CONSTRAINT "crm_site_visits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_site_visits" ADD CONSTRAINT "crm_site_visits_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_site_visits" ADD CONSTRAINT "crm_site_visits_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_site_visits" ADD CONSTRAINT "crm_site_visits_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_site_visits" ADD CONSTRAINT "crm_site_visits_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_site_visits" ADD CONSTRAINT "crm_site_visits_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
