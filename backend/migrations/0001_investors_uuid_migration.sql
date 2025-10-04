-- Migration: convert investors.id from integer to uuid
-- Run this on your PostgreSQL database (NOT sqlite). Take a full backup before running.

BEGIN;

-- 1) Ensure the uuid-ossp extension (or pgcrypto) is available. Use one of these depending on your choice.
-- Using uuid-ossp
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2) Add a new uuid column (nullable for now)
ALTER TABLE investors ADD COLUMN id_new uuid;

-- 3) Populate id_new with random uuids
UPDATE investors SET id_new = uuid_generate_v4();

-- 4) Make id_new NOT NULL
ALTER TABLE investors ALTER COLUMN id_new SET NOT NULL;

-- 5) If you want the uuid to be default-generated on insert
ALTER TABLE investors ALTER COLUMN id_new SET DEFAULT uuid_generate_v4();

-- 6) Drop primary key constraint on old id and any dependent constraints/indexes
ALTER TABLE investors DROP CONSTRAINT investors_pkey;

-- 7) Drop old id column
ALTER TABLE investors DROP COLUMN id;

-- 8) Rename id_new to id
ALTER TABLE investors RENAME COLUMN id_new TO id;

-- 9) Recreate primary key on id
ALTER TABLE investors ADD PRIMARY KEY (id);

COMMIT;

-- Notes:
-- - If other tables reference investors.id as an FK, you'll need to update those FKs to point to the new uuid column. This is more complex and requires dropping/recreating the FK constraints.
-- - For some Postgres installs, you may prefer to use the "pgcrypto" extension and gen_random_uuid() instead of uuid-ossp's uuid_generate_v4() (e.g., on Supabase pg12+).
-- - Always run in a transaction and test on a copy first.
