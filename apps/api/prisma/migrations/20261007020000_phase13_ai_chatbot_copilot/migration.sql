-- Phase 13 patch: AI Chatbot / Property Studio AI Copilot

CREATE TYPE "AiConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');
CREATE TYPE "AiChatMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');
CREATE TYPE "AiChatAnalyticsEventType" AS ENUM (
  'CONVERSATION_STARTED',
  'MESSAGE_SENT',
  'TOOL_INVOKED',
  'PROPERTY_CLICKED',
  'REQUIREMENT_CREATED',
  'REQUIREMENT_CONFIRMATION_PROMPTED'
);

CREATE SEQUENCE IF NOT EXISTS public_id_aconv_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_amsg_seq;
CREATE SEQUENCE IF NOT EXISTS public_id_achev_seq;

CREATE TABLE "ai_conversations" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "organization_id" UUID,
    "title" VARCHAR(200),
    "status" "AiConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "context_json" JSONB,
    "pending_requirement_json" JSONB,
    "last_message_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_conversation_messages" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "AiChatMessageRole" NOT NULL,
    "content" VARCHAR(8000) NOT NULL,
    "coverage_state" "IntelligenceDataState",
    "tool_calls_json" JSONB,
    "tool_results_json" JSONB,
    "cards_json" JSONB,
    "references_json" JSONB,
    "ai_job_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_conversation_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_chat_analytics_events" (
    "id" UUID NOT NULL,
    "public_id" VARCHAR(32) NOT NULL,
    "conversation_id" UUID,
    "actor_user_id" UUID,
    "event_type" "AiChatAnalyticsEventType" NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_conversations_public_id_key" ON "ai_conversations"("public_id");
CREATE INDEX "ai_conversations_owner_user_id_status_idx" ON "ai_conversations"("owner_user_id", "status");
CREATE INDEX "ai_conversations_organization_id_idx" ON "ai_conversations"("organization_id");
CREATE INDEX "ai_conversations_last_message_at_idx" ON "ai_conversations"("last_message_at");

CREATE UNIQUE INDEX "ai_conversation_messages_public_id_key" ON "ai_conversation_messages"("public_id");
CREATE INDEX "ai_conversation_messages_conversation_id_created_at_idx" ON "ai_conversation_messages"("conversation_id", "created_at");

CREATE UNIQUE INDEX "ai_chat_analytics_events_public_id_key" ON "ai_chat_analytics_events"("public_id");
CREATE INDEX "ai_chat_analytics_events_conversation_id_created_at_idx" ON "ai_chat_analytics_events"("conversation_id", "created_at");
CREATE INDEX "ai_chat_analytics_events_event_type_created_at_idx" ON "ai_chat_analytics_events"("event_type", "created_at");

ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_conversation_messages" ADD CONSTRAINT "ai_conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_chat_analytics_events" ADD CONSTRAINT "ai_chat_analytics_events_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
