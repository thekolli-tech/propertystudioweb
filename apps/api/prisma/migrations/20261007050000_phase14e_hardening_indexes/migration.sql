-- Phase 14E: composite indexes for common authorized list/filter paths.
-- Justified by AI context assembly, CRM overdue follow-ups, and org lead queues.

CREATE INDEX IF NOT EXISTS "crm_follow_ups_organization_id_status_due_at_idx"
  ON "crm_follow_ups" ("organization_id", "status", "due_at");

CREATE INDEX IF NOT EXISTS "leads_recipient_organization_id_status_created_at_idx"
  ON "leads" ("recipient_organization_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "crm_deals_organization_id_status_idx"
  ON "crm_deals" ("organization_id", "status");

CREATE INDEX IF NOT EXISTS "crm_site_visits_organization_id_status_scheduled_at_idx"
  ON "crm_site_visits" ("organization_id", "status", "scheduled_at");
