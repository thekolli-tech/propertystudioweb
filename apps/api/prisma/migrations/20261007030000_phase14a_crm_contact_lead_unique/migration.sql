-- Phase 14A: idempotent CRM contact creation from leads.
-- PostgreSQL UNIQUE allows multiple NULLs for source_lead_id.

CREATE UNIQUE INDEX IF NOT EXISTS "crm_contacts_organization_id_source_lead_id_key"
ON "crm_contacts"("organization_id", "source_lead_id");
