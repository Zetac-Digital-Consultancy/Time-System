import { prisma } from "@/lib/prisma";
import type { Prisma, TimerEventType } from "@/generated/prisma/client";
import { businessDate, businessTime, elapsedMinutes } from "@/lib/business-date";
import { calculateWorkedMinutesFromSegments, computeTimeEntryFromTimer } from "@/lib/timer-utils";

const include = {
  segments: { orderBy: { segmentOrder: "asc" as const } },
  events: { orderBy: { occurredAt: "asc" as const } },
  timeEntry: { select: { id: true, totalHours: true, startTime: true, endTime: true, breakMinutes: true } },
};
type Timer = Prisma.WorkTimerGetPayload<{ include: typeof include }>;
function serialize(timer: Timer, now: Date) {
  const active = timer.segments.find(s => s.endTime === null);
  const workedMinutes = calculateWorkedMinutesFromSegments(timer.segments, {
    now, activeStartTime: timer.status === "RUNNING" ? active?.startTime : null,
  });
  return { ...timer, workedMinutes, workedSeconds: workedMinutes * 60,
    activeSegmentStart: active?.startTime ?? null, activeSegmentStartedAt: active?.createdAt ?? null };
}

export async function getWorkTimerState(userId: string) {
  const now = new Date();
  const today = businessDate(now);
  const timers = await prisma.workTimer.findMany({
    where: { userId, OR: [{ status: { in: ["RUNNING", "PAUSED"] } }, { workDate: today }] },
    include, orderBy: { createdAt: "desc" },
  });
  const active = timers.find(t => t.status !== "STOPPED");
  const completedSessions = timers.filter(t => t.status === "STOPPED").map(t => serialize(t, now));
  const state = active ? serialize(active, now) : null;
  const todayTotalMinutes = completedSessions.reduce((sum, t) => sum + t.workedMinutes, 0) +
    (state && state.workDate.getTime() === today.getTime() ? state.workedMinutes : 0);
  return { ...(state ?? { status: null, workedMinutes: 0, workedSeconds: 0, segments: [], events: [], timeEntry: null,
    activeSegmentStart: null, activeSegmentStartedAt: null }), completedSessions, todayTotalMinutes, todayTotalSeconds: todayTotalMinutes * 60 };
}

export async function runTimerAction(userId: string, companyId: string, action: string) {
  if (!["start", "pause", "resume", "stop"].includes(action)) throw new Error("Ungültige Aktion");
  await prisma.$transaction(async tx => {
    // Serialize all timer actions for this employee, including concurrent starts/stops.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findFirst({ where: { id: userId, companyId, status: "ACTIVE", role: "EMPLOYEE", company: { status: "ACTIVE" } } });
    if (!user) throw new Error("Mitarbeiterzugang nicht verfügbar");
    const now = new Date();
    const time = businessTime(now);
    const timer = await tx.workTimer.findFirst({ where: { userId, status: { in: ["RUNNING", "PAUSED"] } }, include });
    if (action === "start") {
      if (timer) throw new Error("Ein Timer ist bereits aktiv. Bitte fortsetzen oder beenden.");
      const workDate = businessDate(now);
      const sessionNumber = await tx.workTimer.count({ where: { userId, workDate } }) + 1;
      await tx.workTimer.create({ data: {
        userId, workDate, sessionNumber, createdAt: now,
        segments: { create: { segmentOrder: 1, startTime: time, createdAt: now } },
        events: { create: { eventType: "START", timeOfDay: time, occurredAt: now } },
      } });
      return;
    }
    if (!timer) throw new Error("Kein aktiver Timer vorhanden");
    if (action === "resume") {
      if (timer.status !== "PAUSED") throw new Error("Timer ist nicht pausiert");
      await tx.timerSegment.create({ data: { workTimerId: timer.id, segmentOrder: timer.segments.length + 1, startTime: time, createdAt: now } });
      await tx.workTimer.update({ where: { id: timer.id }, data: { status: "RUNNING" } });
    } else {
      if (action === "pause" && timer.status !== "RUNNING") throw new Error("Timer läuft nicht");
      const active = timer.segments.find(s => s.endTime === null);
      if (timer.status === "RUNNING") {
        if (!active) throw new Error("Aktives Segment fehlt");
        const data = { endTime: time, endedAt: now, durationMinutes: elapsedMinutes(active.createdAt, now) };
        await tx.timerSegment.update({ where: { id: active.id }, data });
        Object.assign(active, data);
      }
      if (action === "pause") {
        await tx.workTimer.update({ where: { id: timer.id }, data: { status: "PAUSED" } });
      } else {
        const data = computeTimeEntryFromTimer(timer.segments, time);
        const entry = await tx.timeEntry.create({ data: {
          ...data, userId, workDate: timer.workDate, source: "TIMER",
          notes: `Automatisch via Arbeits-Timer erfasst (Sitzung ${timer.sessionNumber})`,
        } });
        await tx.workTimer.update({ where: { id: timer.id }, data: { status: "STOPPED", timeEntryId: entry.id } });
      }
    }
    await tx.timerEvent.create({ data: {
      workTimerId: timer.id, eventType: action.toUpperCase() as TimerEventType, timeOfDay: time, occurredAt: now,
    } });
  });
  return getWorkTimerState(userId);
}
