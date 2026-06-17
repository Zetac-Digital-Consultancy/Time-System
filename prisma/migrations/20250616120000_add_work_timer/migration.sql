-- CreateEnum (idempotent — safe when schema was previously applied via db push)
DO $$ BEGIN
  CREATE TYPE "TimeEntrySource" AS ENUM ('MANUAL', 'TIMER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TimerStatus" AS ENUM ('RUNNING', 'PAUSED', 'STOPPED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TimerEventType" AS ENUM ('START', 'PAUSE', 'RESUME', 'STOP');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "time_entries" ADD COLUMN IF NOT EXISTS "source" "TimeEntrySource" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "time_entries_source_idx" ON "time_entries"("source");

-- CreateTable
CREATE TABLE IF NOT EXISTS "work_timers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "work_date" DATE NOT NULL,
    "status" "TimerStatus" NOT NULL DEFAULT 'RUNNING',
    "time_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_timers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "timer_segments" (
    "id" TEXT NOT NULL,
    "work_timer_id" TEXT NOT NULL,
    "segment_order" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT,
    "duration_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timer_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "timer_events" (
    "id" TEXT NOT NULL,
    "work_timer_id" TEXT NOT NULL,
    "event_type" "TimerEventType" NOT NULL,
    "time_of_day" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timer_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "work_timers_time_entry_id_key" ON "work_timers"("time_entry_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "work_timers_user_id_idx" ON "work_timers"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "work_timers_work_date_idx" ON "work_timers"("work_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "work_timers_status_idx" ON "work_timers"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "work_timers_user_id_work_date_key" ON "work_timers"("user_id", "work_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "timer_segments_work_timer_id_idx" ON "timer_segments"("work_timer_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "timer_events_work_timer_id_idx" ON "timer_events"("work_timer_id");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "work_timers" ADD CONSTRAINT "work_timers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "work_timers" ADD CONSTRAINT "work_timers_time_entry_id_fkey" FOREIGN KEY ("time_entry_id") REFERENCES "time_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "timer_segments" ADD CONSTRAINT "timer_segments_work_timer_id_fkey" FOREIGN KEY ("work_timer_id") REFERENCES "work_timers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "timer_events" ADD CONSTRAINT "timer_events_work_timer_id_fkey" FOREIGN KEY ("work_timer_id") REFERENCES "work_timers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
