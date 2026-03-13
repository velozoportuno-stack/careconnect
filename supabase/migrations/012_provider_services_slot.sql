-- Migration 012: Add slot column to provider_services for 2-profile slot design
-- Each professional can have exactly 2 service profiles (slot 1 and slot 2)

-- 1. Add slot column (default 1 for existing rows)
ALTER TABLE provider_services
  ADD COLUMN IF NOT EXISTS slot INTEGER DEFAULT 1;

-- 2. Assign slot numbers to existing rows based on creation order per provider
--    (keeps first 2 rows as slot 1 and 2; marks extras for removal)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY provider_id ORDER BY created_at ASC) AS rn
  FROM provider_services
  WHERE slot IS NULL OR slot = 1  -- re-rank any rows not yet slotted
)
UPDATE provider_services
SET slot = ranked.rn
FROM ranked
WHERE provider_services.id = ranked.id;

-- 3. Remove any rows beyond slot 2 (the old list could have more)
DELETE FROM provider_services
WHERE slot > 2;

-- 4. Make slot NOT NULL now that all rows have a value
ALTER TABLE provider_services
  ALTER COLUMN slot SET NOT NULL;

-- 5. Add unique constraint (safe: only runs if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'provider_services_provider_slot_unique'
  ) THEN
    ALTER TABLE provider_services
      ADD CONSTRAINT provider_services_provider_slot_unique
      UNIQUE (provider_id, slot);
  END IF;
END $$;
