import { prisma } from "@/lib/prisma";
import {
  calculateWorkedMinutesFromSegments,
  computeTimeEntryFromTimer,
  formatTimeOfDay,
  getTodayDateOnly,
  minutesBetweenTimes,
} from "@/lib/timer-utils";
import type { TimerEventType, TimerStatus } from "@/generated/prisma/client";

const timerInclude = {
  segments: { orderBy: { segmentOrder: "asc" as const } },
  events: { orderBy: { occurredAt: "asc" as const } },
  timeEntry: {
    select: {
      id: true,
      totalHours: true,
      startTime: true,
      endTime: true,
      breakMinutes: true,
    },
  },
};

type TimerWithRelations = NonNullable<Awaited<ReturnType<typeof getActiveWorkTimer>>>;

function assertPrismaTimerModels(): void {
  if (!prisma.workTimer || !prisma.timerSegment || !prisma.timerEvent) {
    throw new Error(
      "Timer-Datenbankmodelle nicht verfügbar. Bitte `npx prisma generate` ausführen und den Server neu starten."
    );
  }
}

function assertUserId(userId: string | undefined): asserts userId is string {
  if (!userId) {
    throw new Error("Benutzer-ID fehlt. Bitte erneut anmelden.");
  }
}

export async function getActiveWorkTimer(userId: string, date: Date = new Date()) {
  assertPrismaTimerModels();
  assertUserId(userId);
  const workDate = getTodayDateOnly(date);
  return prisma.workTimer.findFirst({
    where: {
      userId,
      workDate,
      status: { in: ["RUNNING", "PAUSED"] },
    },
    include: timerInclude,
    orderBy: { createdAt: "desc" },
  });
}

async function getCompletedTimersForToday(userId: string, date: Date = new Date()) {
  const workDate = getTodayDateOnly(date);
  return prisma.workTimer.findMany({
    where: { userId, workDate, status: "STOPPED" },
    include: timerInclude,
    orderBy: { sessionNumber: "asc" },
  });
}

function serializeTimer(timer: TimerWithRelations) {
  const activeSegment = timer.segments.find((s) => s.endTime === null);
  const workedMinutes = calculateWorkedMinutesFromSegments(timer.segments, {
    activeStartTime: timer.status === "RUNNING" ? activeSegment?.startTime : null,
  });

  return {
    id: timer.id,
    status: timer.status as TimerStatus,
    sessionNumber: timer.sessionNumber,
    workDate: timer.workDate,
    workedMinutes,
    workedSeconds: workedMinutes * 60,
    activeSegmentStart: activeSegment?.startTime ?? null,
    segments: timer.segments,
    events: timer.events,
    timeEntry: timer.timeEntry,
    createdAt: timer.createdAt,
    updatedAt: timer.updatedAt,
  };
}

function sumWorkedMinutes(
  timers: Array<{ segments: TimerWithRelations["segments"]; status: TimerStatus }>
): number {
  return timers.reduce(
    (sum, timer) => sum + calculateWorkedMinutesFromSegments(timer.segments),
    0
  );
}

export async function getWorkTimerState(userId: string) {
  const [active, completedToday] = await Promise.all([
    getActiveWorkTimer(userId),
    getCompletedTimersForToday(userId),
  ]);

  const completedSessions = completedToday.map(serializeTimer);
  const todayTotalMinutes =
    sumWorkedMinutes(completedToday) +
    (active ? calculateWorkedMinutesFromSegments(active.segments, {
      activeStartTime: active.status === "RUNNING"
        ? active.segments.find((s) => s.endTime === null)?.startTime ?? null
        : null,
    }) : 0);

  if (!active) {
    return {
      status: null as TimerStatus | null,
      workedMinutes: 0,
      workedSeconds: 0,
      segments: [],
      events: [],
      timeEntry: null,
      activeSegmentStart: null,
      completedSessions,
      todayTotalMinutes,
      todayTotalSeconds: todayTotalMinutes * 60,
    };
  }

  return {
    ...serializeTimer(active),
    completedSessions,
    todayTotalMinutes,
    todayTotalSeconds: todayTotalMinutes * 60,
  };
}

async function createTimerEvent(workTimerId: string, eventType: TimerEventType, now: Date) {
  return prisma.timerEvent.create({
    data: {
      workTimerId,
      eventType,
      timeOfDay: formatTimeOfDay(now),
      occurredAt: now,
    },
  });
}

export async function startWorkTimer(userId: string) {
  assertPrismaTimerModels();
  assertUserId(userId);
  const now = new Date();
  const workDate = getTodayDateOnly(now);
  const timeOfDay = formatTimeOfDay(now);

  const active = await getActiveWorkTimer(userId, now);

  if (active?.status === "RUNNING") {
    throw new Error("Der Timer läuft bereits.");
  }

  if (active?.status === "PAUSED") {
    throw new Error("Der Timer ist pausiert. Bitte „Weiter“ verwenden.");
  }

  const sessionNumber =
    (await prisma.workTimer.count({ where: { userId, workDate } })) + 1;

  const timer = await prisma.workTimer.create({
    data: {
      userId,
      workDate,
      sessionNumber,
      status: "RUNNING",
      segments: {
        create: {
          segmentOrder: 1,
          startTime: timeOfDay,
        },
      },
      events: {
        create: {
          eventType: "START",
          timeOfDay,
          occurredAt: now,
        },
      },
    },
    include: timerInclude,
  });

  const completedToday = await getCompletedTimersForToday(userId, now);
  const state = serializeTimer(timer);
  const todayTotalMinutes =
    sumWorkedMinutes(completedToday) +
    calculateWorkedMinutesFromSegments(timer.segments, { activeStartTime: timeOfDay });

  return {
    ...state,
    completedSessions: completedToday.map(serializeTimer),
    todayTotalMinutes,
    todayTotalSeconds: todayTotalMinutes * 60,
  };
}

export async function pauseWorkTimer(userId: string) {
  assertPrismaTimerModels();
  assertUserId(userId);
  const now = new Date();
  const timeOfDay = formatTimeOfDay(now);

  const timer = await getActiveWorkTimer(userId, now);

  if (!timer || timer.status !== "RUNNING") {
    throw new Error("Es läuft kein aktiver Timer.");
  }

  const activeSegment = timer.segments.find((s) => s.endTime === null);
  if (!activeSegment) {
    throw new Error("Kein aktives Arbeitsegment gefunden.");
  }

  const durationMinutes = minutesBetweenTimes(activeSegment.startTime, timeOfDay);

  await prisma.$transaction([
    prisma.timerSegment.update({
      where: { id: activeSegment.id },
      data: { endTime: timeOfDay, durationMinutes },
    }),
    prisma.workTimer.update({
      where: { id: timer.id },
      data: { status: "PAUSED" },
    }),
  ]);

  await createTimerEvent(timer.id, "PAUSE", now);

  return getWorkTimerState(userId);
}

export async function resumeWorkTimer(userId: string) {
  assertPrismaTimerModels();
  assertUserId(userId);
  const now = new Date();
  const timeOfDay = formatTimeOfDay(now);

  const timer = await getActiveWorkTimer(userId, now);

  if (!timer || timer.status !== "PAUSED") {
    throw new Error("Es ist kein pausierter Timer vorhanden.");
  }

  const nextOrder = timer.segments.length + 1;

  await prisma.$transaction([
    prisma.timerSegment.create({
      data: {
        workTimerId: timer.id,
        segmentOrder: nextOrder,
        startTime: timeOfDay,
      },
    }),
    prisma.workTimer.update({
      where: { id: timer.id },
      data: { status: "RUNNING" },
    }),
  ]);

  await createTimerEvent(timer.id, "RESUME", now);

  return getWorkTimerState(userId);
}

export async function stopWorkTimer(userId: string) {
  assertPrismaTimerModels();
  assertUserId(userId);
  const now = new Date();
  const workDate = getTodayDateOnly(now);
  const timeOfDay = formatTimeOfDay(now);

  const timer = await getActiveWorkTimer(userId, now);

  if (!timer) {
    throw new Error("Kein aktiver Timer für heute gefunden.");
  }

  let segments = [...timer.segments];

  if (timer.status === "RUNNING") {
    const activeSegment = segments.find((s) => s.endTime === null);
    if (!activeSegment) {
      throw new Error("Kein aktives Arbeitsegment gefunden.");
    }
    const durationMinutes = minutesBetweenTimes(activeSegment.startTime, timeOfDay);
    await prisma.timerSegment.update({
      where: { id: activeSegment.id },
      data: { endTime: timeOfDay, durationMinutes },
    });
    segments = segments.map((s) =>
      s.id === activeSegment.id ? { ...s, endTime: timeOfDay, durationMinutes } : s
    );
  }

  const { startTime, endTime, breakMinutes, totalHours } = computeTimeEntryFromTimer(
    segments,
    timeOfDay
  );

  await prisma.$transaction(async (tx) => {
    await tx.timerEvent.create({
      data: {
        workTimerId: timer.id,
        eventType: "STOP",
        timeOfDay,
        occurredAt: now,
      },
    });

    const timeEntry = await tx.timeEntry.create({
      data: {
        userId,
        workDate,
        startTime,
        endTime,
        breakMinutes,
        totalHours,
        source: "TIMER",
        notes: `Automatisch via Arbeits-Timer erfasst (Sitzung ${timer.sessionNumber})`,
        baustelleId: null,
      },
    });

    await tx.workTimer.update({
      where: { id: timer.id },
      data: {
        status: "STOPPED",
        timeEntryId: timeEntry.id,
      },
    });
  });

  return getWorkTimerState(userId);
}
