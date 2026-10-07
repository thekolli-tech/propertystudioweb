-- Phase 13: Partner API, Integrations & Automation

CREATE TYPE "PartnerIntegrationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');
CREATE TYPE "PartnerIntegrationType" AS ENUM (
  'PROPERTY_PORTAL', 'BUILDER', 'DEVELOPER', 'AGENCY', 'CRM_VENDOR',
  'MARKETING_PLATFORM', 'CHANNEL_PARTNER', 'ENTERPRISE', 'DATA_PROVIDER', 'OTHER'
);
CREATE TYPE "ApiClientStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "ApiClientEnvironment" AS ENUM ('LIVE', 'TEST');
CREATE TYPE "OutboundWebhookStatus" AS ENUM ('ACTIVE', 'DISABLED', 'FAILING');
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER');
CREATE TYPE "DomainEventStatus" AS ENUM ('PENDING', 'DISPATCHED', 'FAILED');
CREATE TYPE "BackgroundJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER');
CREATE TYPE "DeadLetterStatus" AS ENUM ('OPEN', 'RETRIED', 'DISCARDED');
CREATE TYPE "ExternalResourceType" AS ENUM ('PROPERTY', 'PROJECT', 'INVENTORY');
CREATE TYPE "ExternalMappingStatus" AS ENUM ('NEW', 'UPDATED', 'REMOVED', 'UNAVAILABLE', 'CONFLICT');
CREATE TYPE "IntegrationHealthStatus" AS ENUM (
  'CONNECTED', 'HEALTHY', 'DEGRADED', 'FAILING', 'SUSPENDED', 'UNAVAILABLE'
);
CREATE TYPE "AutomationRuleStatus" AS ENUM ('ENABLED', 'DISABLED');
CREATE TYPE "NotificationProviderKind" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');
CREATE TYPE "NotificationProviderStatus" AS ENUM ('CONFIGURED', 'UNAVAILABLE', 'DISABLED');

CREATE SEQUENCE IF NOT EXISTS public_id_pint_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_akey_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_whk_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_whdel_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_devnt_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_job_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_dlq_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_xmap_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_iusg_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_rule_seq;

CREATE TABLE "partner_integrations" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "integration_type" "PartnerIntegrationType" NOT NULL,
    "status" "PartnerIntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "health_status" "IntegrationHealthStatus" NOT NULL DEFAULT 'CONNECTED',
    "owner_user_id" UUID,
    "metadata_json" JSONB,
    "last_successful_at" TIMESTAMPTZ(3),
    "last_failed_at" TIMESTAMPTZ(3),
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "partner_integrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_clients" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "partner_integration_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "environment" "ApiClientEnvironment" NOT NULL DEFAULT 'LIVE',
    "key_prefix" VARCHAR(24) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ApiClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ(3),
    "last_used_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "api_clients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outbound_webhook_endpoints" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "partner_integration_id" UUID NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "description" VARCHAR(240),
    "secret_ciphertext" TEXT NOT NULL,
    "secret_prefix" VARCHAR(16) NOT NULL,
    "subscribed_events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "OutboundWebhookStatus" NOT NULL DEFAULT 'ACTIVE',
    "max_attempts" INTEGER NOT NULL DEFAULT 8,
    "last_success_at" TIMESTAMPTZ(3),
    "last_failure_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "outbound_webhook_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "domain_events" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "event_type" VARCHAR(80) NOT NULL,
    "resource_type" VARCHAR(80) NOT NULL,
    "resource_public_id" VARCHAR(32),
    "organization_id" UUID,
    "api_version" VARCHAR(8) NOT NULL DEFAULT 'v1',
    "payload_json" JSONB NOT NULL,
    "status" "DomainEventStatus" NOT NULL DEFAULT 'PENDING',
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatched_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "endpoint_id" UUID NOT NULL,
    "domain_event_id" UUID NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "response_status" INTEGER,
    "response_body" VARCHAR(2000),
    "last_error" VARCHAR(500),
    "next_retry_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "background_jobs" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "job_type" VARCHAR(80) NOT NULL,
    "status" "BackgroundJobStatus" NOT NULL DEFAULT 'PENDING',
    "payload_json" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 8,
    "failure_reason" VARCHAR(500),
    "scheduled_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dead_letter_events" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "source_type" VARCHAR(40) NOT NULL,
    "source_id" VARCHAR(64) NOT NULL,
    "destination" VARCHAR(1000) NOT NULL,
    "failure_reason" VARCHAR(500) NOT NULL,
    "attempt_count" INTEGER NOT NULL,
    "last_response" VARCHAR(2000),
    "status" "DeadLetterStatus" NOT NULL DEFAULT 'OPEN',
    "payload_json" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "resolved_at" TIMESTAMPTZ(3),

    CONSTRAINT "dead_letter_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_resource_mappings" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID,
    "provider" VARCHAR(80) NOT NULL,
    "resource_type" "ExternalResourceType" NOT NULL,
    "external_id" VARCHAR(160) NOT NULL,
    "canonical_public_id" VARCHAR(32),
    "status" "ExternalMappingStatus" NOT NULL DEFAULT 'NEW',
    "conflict_reason" VARCHAR(500),
    "last_synced_at" TIMESTAMPTZ(3),
    "payload_hash" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "external_resource_mappings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_usage_events" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "partner_integration_id" UUID,
    "api_client_id" UUID,
    "endpoint_category" VARCHAR(80) NOT NULL,
    "http_method" VARCHAR(12) NOT NULL,
    "path" VARCHAR(320) NOT NULL,
    "status_code" INTEGER NOT NULL,
    "response_time_ms" INTEGER NOT NULL,
    "rate_limited" BOOLEAN NOT NULL DEFAULT false,
    "resource_type" VARCHAR(80),
    "resource_public_id" VARCHAR(32),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_usage_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "automation_rules" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "trigger_event" VARCHAR(80) NOT NULL,
    "action_type" VARCHAR(80) NOT NULL,
    "action_config" JSONB NOT NULL,
    "status" "AutomationRuleStatus" NOT NULL DEFAULT 'ENABLED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_integrations_public_id_key" ON "partner_integrations"("public_id");
CREATE INDEX "partner_integrations_organization_id_idx" ON "partner_integrations"("organization_id");
CREATE INDEX "partner_integrations_status_idx" ON "partner_integrations"("status");
CREATE INDEX "partner_integrations_health_status_idx" ON "partner_integrations"("health_status");

CREATE UNIQUE INDEX "api_clients_public_id_key" ON "api_clients"("public_id");
CREATE UNIQUE INDEX "api_clients_key_prefix_key" ON "api_clients"("key_prefix");
CREATE INDEX "api_clients_partner_integration_id_idx" ON "api_clients"("partner_integration_id");
CREATE INDEX "api_clients_status_idx" ON "api_clients"("status");

CREATE UNIQUE INDEX "outbound_webhook_endpoints_public_id_key" ON "outbound_webhook_endpoints"("public_id");
CREATE INDEX "outbound_webhook_endpoints_partner_integration_id_idx" ON "outbound_webhook_endpoints"("partner_integration_id");
CREATE INDEX "outbound_webhook_endpoints_status_idx" ON "outbound_webhook_endpoints"("status");

CREATE UNIQUE INDEX "domain_events_public_id_key" ON "domain_events"("public_id");
CREATE INDEX "domain_events_event_type_idx" ON "domain_events"("event_type");
CREATE INDEX "domain_events_organization_id_idx" ON "domain_events"("organization_id");
CREATE INDEX "domain_events_status_idx" ON "domain_events"("status");
CREATE INDEX "domain_events_occurred_at_idx" ON "domain_events"("occurred_at");

CREATE UNIQUE INDEX "webhook_deliveries_public_id_key" ON "webhook_deliveries"("public_id");
CREATE UNIQUE INDEX "webhook_deliveries_endpoint_id_domain_event_id_key" ON "webhook_deliveries"("endpoint_id", "domain_event_id");
CREATE INDEX "webhook_deliveries_status_idx" ON "webhook_deliveries"("status");
CREATE INDEX "webhook_deliveries_next_retry_at_idx" ON "webhook_deliveries"("next_retry_at");

CREATE UNIQUE INDEX "background_jobs_public_id_key" ON "background_jobs"("public_id");
CREATE INDEX "background_jobs_status_scheduled_at_idx" ON "background_jobs"("status", "scheduled_at");
CREATE INDEX "background_jobs_job_type_idx" ON "background_jobs"("job_type");

CREATE UNIQUE INDEX "dead_letter_events_public_id_key" ON "dead_letter_events"("public_id");
CREATE INDEX "dead_letter_events_status_idx" ON "dead_letter_events"("status");
CREATE INDEX "dead_letter_events_source_type_source_id_idx" ON "dead_letter_events"("source_type", "source_id");

CREATE UNIQUE INDEX "external_resource_mappings_public_id_key" ON "external_resource_mappings"("public_id");
CREATE UNIQUE INDEX "external_resource_mappings_provider_resource_type_external_id_key" ON "external_resource_mappings"("provider", "resource_type", "external_id");
CREATE INDEX "external_resource_mappings_organization_id_idx" ON "external_resource_mappings"("organization_id");
CREATE INDEX "external_resource_mappings_canonical_public_id_idx" ON "external_resource_mappings"("canonical_public_id");
CREATE INDEX "external_resource_mappings_status_idx" ON "external_resource_mappings"("status");

CREATE UNIQUE INDEX "integration_usage_events_public_id_key" ON "integration_usage_events"("public_id");
CREATE INDEX "integration_usage_events_partner_integration_id_created_at_idx" ON "integration_usage_events"("partner_integration_id", "created_at");
CREATE INDEX "integration_usage_events_api_client_id_created_at_idx" ON "integration_usage_events"("api_client_id", "created_at");
CREATE INDEX "integration_usage_events_created_at_idx" ON "integration_usage_events"("created_at");

CREATE UNIQUE INDEX "automation_rules_public_id_key" ON "automation_rules"("public_id");
CREATE INDEX "automation_rules_organization_id_idx" ON "automation_rules"("organization_id");
CREATE INDEX "automation_rules_trigger_event_status_idx" ON "automation_rules"("trigger_event", "status");

ALTER TABLE "partner_integrations" ADD CONSTRAINT "partner_integrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_clients" ADD CONSTRAINT "api_clients_partner_integration_id_fkey" FOREIGN KEY ("partner_integration_id") REFERENCES "partner_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outbound_webhook_endpoints" ADD CONSTRAINT "outbound_webhook_endpoints_partner_integration_id_fkey" FOREIGN KEY ("partner_integration_id") REFERENCES "partner_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "outbound_webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_domain_event_id_fkey" FOREIGN KEY ("domain_event_id") REFERENCES "domain_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_resource_mappings" ADD CONSTRAINT "external_resource_mappings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "integration_usage_events" ADD CONSTRAINT "integration_usage_events_partner_integration_id_fkey" FOREIGN KEY ("partner_integration_id") REFERENCES "partner_integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "integration_usage_events" ADD CONSTRAINT "integration_usage_events_api_client_id_fkey" FOREIGN KEY ("api_client_id") REFERENCES "api_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
