"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pause, Play, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDurationFromSeconds, TIMER_STATUS_LABELS } from "@/lib/timer-utils";

type TimerStatus = "RUNNING" | "PAUSED" | "STOPPED" | null;

interface TimerSegment {
  id: string;
  segmentOrder: number;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
}

interface TimerEvent {
  id: string;
  eventType: "START" | "PAUSE" | "RESUME" | "STOP";
  timeOfDay: string;
  occurredAt: string;
}

interface SerializedTimer {
  id: string;
  status: TimerStatus;
  sessionNumber?: number;
  workedMinutes: number;
  workedSeconds: number;
  activeSegmentStart: string | null;
  segments: TimerSegment[];
  events: TimerEvent[];
  timeEntry: {
    id: string;
    totalHours: number;
    startTime: string;
    endTime: string;
    breakMinutes: number;
  } | null;
}

interface WorkTimerState extends SerializedTimer {
  status: TimerStatus;
  completedSessions?: SerializedTimer[];
  todayTotalMinutes?: number;
  todayTotalSeconds?: number;
}

interface WorkTimerCardProps {
  onStopped?: () => void;
}

function getLiveSeconds(state: WorkTimerState): number {
  let total = state.segments.reduce((sum, seg) => sum + (seg.durationMinutes ?? 0) * 60, 0);
  if (state.status === "RUNNING" && state.activeSegmentStart) {
    const now = new Date();
    const [h, m] = state.activeSegmentStart.split(":").map(Number);
    const start = new Date(now);
    start.setHours(h, m, 0, 0);
    total += Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
  }
  return total;
}

const EVENT_LABELS: Record<TimerEvent["eventType"], string> = {
  START: "Gestartet",
  PAUSE: "Pause",
  RESUME: "Fortgesetzt",
  STOP: "Beendet",
};

export function WorkTimerCard({ onStopped }: WorkTimerCardProps) {
  const [state, setState] = useState<WorkTimerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [liveSeconds, setLiveSeconds] = useState(0);

  const applyState = useCallback((data: WorkTimerState) => {
    setState(data);
    setLiveSeconds(
      data.status === "RUNNING"
        ? getLiveSeconds(data)
        : (data.todayTotalSeconds ?? data.workedSeconds ?? 0)
    );
  }, []);

  const fetchState = useCallback(async () => {
    const res = await fetch("/api/work-timer");
    const data = (await res.json()) as WorkTimerState & { error?: string };
    if (!res.ok) {
      throw new Error(data.error ?? "Timer konnte nicht geladen werden");
    }
    applyState(data);
    return data;
  }, [applyState]);

  useEffect(() => {
    fetchState()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [fetchState]);

  useEffect(() => {
    if (!state || state.status !== "RUNNING") return;
    const interval = setInterval(() => {
      setLiveSeconds(getLiveSeconds(state));
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  async function runAction(action: "start" | "pause" | "resume" | "stop") {
    setActing(true);
    setError("");
    try {
      const res = await fetch("/api/work-timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as WorkTimerState & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Aktion fehlgeschlagen");
      }
      applyState(data);
      if (action === "stop") onStopped?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aktion fehlgeschlagen");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Timer wird geladen...
        </CardContent>
      </Card>
    );
  }

  const status = state?.status ?? null;
  const isIdle = status === null;
  const isRunning = status === "RUNNING";
  const isPaused = status === "PAUSED";
  const completedSessions = state?.completedSessions ?? [];
  const hasCompletedToday = completedSessions.length > 0;
  const sessionLabel =
    state?.sessionNumber != null ? `Sitzung ${state.sessionNumber}` : undefined;

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Timer className="h-5 w-5 text-primary" />
            Arbeits-Timer
            {sessionLabel && isRunning && (
              <span className="text-sm font-normal text-muted-foreground">({sessionLabel})</span>
            )}
          </CardTitle>
          {status && (
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                isRunning && "bg-green-500/15 text-green-700 dark:text-green-400",
                isPaused && "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              )}
            >
              {TIMER_STATUS_LABELS[status]}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl bg-muted/60 px-4 py-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {isRunning ? "Aktuelle Arbeitszeit" : hasCompletedToday ? "Timer-Zeit heute gesamt" : "Heutige Timer-Zeit"}
          </p>
          <p className="mt-2 font-mono text-4xl font-bold tabular-nums tracking-tight md:text-5xl">
            {formatDurationFromSeconds(liveSeconds)}
          </p>
          {isIdle && hasCompletedToday && (
            <p className="mt-2 text-sm text-muted-foreground">
              {completedSessions.length} abgeschlossene Sitzung
              {completedSessions.length === 1 ? "" : "en"} — neue Sitzung starten
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {isIdle && (
            <Button
              size="lg"
              className="col-span-2 min-h-14 text-base md:col-span-4"
              disabled={acting}
              onClick={() => runAction("start")}
            >
              {acting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
              {hasCompletedToday ? "Neue Sitzung starten" : "Start"}
            </Button>
          )}
          {isRunning && (
            <>
              <Button
                size="lg"
                variant="outline"
                className="min-h-14 text-base"
                disabled={acting}
                onClick={() => runAction("pause")}
              >
                <Pause className="h-5 w-5" />
                Pause
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="min-h-14 text-base"
                disabled={acting}
                onClick={() => runAction("stop")}
              >
                <Square className="h-5 w-5" />
                Stopp
              </Button>
            </>
          )}
          {isPaused && (
            <>
              <Button
                size="lg"
                className="min-h-14 text-base"
                disabled={acting}
                onClick={() => runAction("resume")}
              >
                <Play className="h-5 w-5" />
                Weiter
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="min-h-14 text-base"
                disabled={acting}
                onClick={() => runAction("stop")}
              >
                <Square className="h-5 w-5" />
                Stopp
              </Button>
            </>
          )}
        </div>

        {(state?.segments.length ?? 0) > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">
              {sessionLabel ? `Segmente (${sessionLabel})` : "Heutige Segmente"}
            </p>
            <div className="space-y-2">
              {state!.segments.map((segment) => (
                <div
                  key={segment.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm"
                >
                  <span className="font-medium">
                    Segment {segment.segmentOrder}: {segment.startTime}
                    {segment.endTime ? ` – ${segment.endTime}` : " – läuft"}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {segment.durationMinutes != null ? `${segment.durationMinutes} Min` : "–"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasCompletedToday && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Abgeschlossene Sitzungen heute</p>
            <div className="space-y-2">
              {completedSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5 text-sm"
                >
                  <span>
                    Sitzung {session.sessionNumber ?? "–"}
                    {session.timeEntry
                      ? `: ${session.timeEntry.startTime}–${session.timeEntry.endTime}`
                      : ""}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {session.timeEntry
                      ? `${session.timeEntry.totalHours.toFixed(2)}h`
                      : `${session.workedMinutes} Min`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(state?.events.length ?? 0) > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Verlauf</p>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {state!.events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between text-xs text-muted-foreground md:text-sm"
                >
                  <span>{EVENT_LABELS[event.eventType]}</span>
                  <span className="font-mono tabular-nums">{event.timeOfDay}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
