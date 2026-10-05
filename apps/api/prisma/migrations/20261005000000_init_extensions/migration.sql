-- Phase 1 foundation: enable extensions required by later kernel tables.
-- No business tables are created in this migration.

CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
