-- Drop overtime_hours column from time_entries
ALTER TABLE "time_entries" DROP COLUMN IF EXISTS "overtime_hours";
