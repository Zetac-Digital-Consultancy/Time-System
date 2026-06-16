-- Allow multiple timer sessions per employee per day (remove one-timer-per-day constraint)
ALTER TABLE "work_timers" ADD COLUMN IF NOT EXISTS "session_number" INTEGER NOT NULL DEFAULT 1;

DROP INDEX IF EXISTS "work_timers_user_id_work_date_key";

CREATE INDEX IF NOT EXISTS "work_timers_user_id_work_date_idx" ON "work_timers"("user_id", "work_date");
