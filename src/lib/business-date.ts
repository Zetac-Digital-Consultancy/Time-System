export const BUSINESS_TIME_ZONE = "Europe/Berlin";
export function businessDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return new Date(`${part("year")}-${part("month")}-${part("day")}T00:00:00.000Z`);
}
export function businessTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: BUSINESS_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}
export function elapsedMinutes(start: Date | string, end: Date | string) {
  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}
