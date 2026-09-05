import { businessDate } from "./business-date";

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function calculateTotalHours(
  startTime: string,
  endTime: string,
  breakMinutes: number
): number {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  let workedMinutes = endMinutes - startMinutes;
  if (workedMinutes < 0) {
    workedMinutes += 24 * 60;
  }

  workedMinutes -= breakMinutes;
  if (workedMinutes < 0) workedMinutes = 0;

  return Math.round((workedMinutes / 60) * 100) / 100;
}

export function getStartOfWeek(date: Date = new Date()): Date {
  const d = businessDate(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function getStartOfMonth(date: Date = new Date()): Date {
  const d = businessDate(date);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function getEndOfDay(date: Date = new Date()): Date {
  const d = businessDate(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
