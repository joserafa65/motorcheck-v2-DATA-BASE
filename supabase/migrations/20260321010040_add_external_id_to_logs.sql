/*
  # Add external_id to fuel_logs and service_logs

  ## Purpose
  Prevent duplicate rows when the app syncs the same local log multiple times.
  The frontend generates a stable UUID (log.id) that we store as external_id.
  Subsequent syncs upsert on this column instead of blindly inserting.

  ## Changes

  ### fuel_logs
  - New column `external_id TEXT` — stores the frontend-generated log ID
  - Unique constraint `fuel_logs_external_id_key` on external_id (nulls not constrained)

  ### service_logs
  - New column `external_id TEXT` — stores the frontend-generated log ID
  - Unique constraint `service_logs_external_id_key` on external_id (nulls not constrained)

  ## Notes
  - Existing rows get NULL for external_id; they are unaffected.
  - No data is deleted or modified.
  - RLS policies are unchanged.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fuel_logs' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE fuel_logs ADD COLUMN external_id TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'fuel_logs' AND indexname = 'fuel_logs_external_id_key'
  ) THEN
    CREATE UNIQUE INDEX fuel_logs_external_id_key ON fuel_logs (external_id) WHERE external_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_logs' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE service_logs ADD COLUMN external_id TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'service_logs' AND indexname = 'service_logs_external_id_key'
  ) THEN
    CREATE UNIQUE INDEX service_logs_external_id_key ON service_logs (external_id) WHERE external_id IS NOT NULL;
  END IF;
END $$;
