import { parseTimeToMinutes } from "@/lib/time-utils";

export type TimerSegmentLike = {
  segmentOrder: number;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
};

export function formatTimeOfDay(date: Date = new Date()): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function getTodayDateOnly(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function minutesBetweenTimes(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  let diff = end - start;
  if (diff < 0) diff += 24 * 60;
  return diff;
}

export function calculateBreakMinutesBetweenSegments(segments: TimerSegmentLike[]): number {
  const sorted = [...segments].sort((a, b) => a.segmentOrder - b.segmentOrder);
  let breakMinutes = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (current.endTime) {
      breakMinutes += minutesBetweenTimes(current.endTime, next.startTime);
    }
  }

  return breakMinutes;
}

export function calculateWorkedMinutesFromSegments(
  segments: TimerSegmentLike[],
  options?: { activeStartTime?: string | null; now?: Date }
): number {
  const now = options?.now ?? new Date();
  const nowTime = formatTimeOfDay(now);
  let total = 0;

  for (const segment of segments) {
    if (segment.durationMinutes != null) {
      total += segment.durationMinutes;
    }
  }

  if (options?.activeStartTime) {
    total += minutesBetweenTimes(options.activeStartTime, nowTime);
  }

  return total;
}

export function computeTimeEntryFromTimer(
  segments: TimerSegmentLike[],
  stopTime: string
): {
  startTime: string;
  endTime: string;
  breakMinutes: number;
  totalHours: number;
} {
  const sorted = [...segments].sort((a, b) => a.segmentOrder - b.segmentOrder);
  if (sorted.length === 0) {
    throw new Error("Keine Timer-Segmente vorhanden");
  }

  const startTime = sorted[0].startTime;
  const endTime = stopTime;
  const breakMinutes = calculateBreakMinutesBetweenSegments(sorted);
  const workedMinutes = sorted.reduce((sum, segment) => sum + (segment.durationMinutes ?? 0), 0);
  const totalHours = Math.round((workedMinutes / 60) * 100) / 100;

  return { startTime, endTime, breakMinutes, totalHours };
}

export function formatDurationFromSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDurationFromMinutes(totalMinutes: number): string {
  return formatDurationFromSeconds(Math.floor(totalMinutes * 60));
}

export const TIMER_STATUS_LABELS = {
  RUNNING: "Läuft",
  PAUSED: "Pausiert",
  STOPPED: "Beendet",
} as const;
