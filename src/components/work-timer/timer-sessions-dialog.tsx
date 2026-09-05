"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateDE } from "@/lib/utils";

interface TimerDetail {
  id: string;
  workDate: string;
  status: string;
  user: { name: string };
  segments: Array<{
    segmentOrder: number;
    startTime: string;
    endTime: string | null;
    durationMinutes: number | null;
  }>;
  events: Array<{
    eventType: string;
    timeOfDay: string;
  }>;
  timeEntry: {
    totalHours: number;
    startTime: string;
    endTime: string;
    breakMinutes: number;
  } | null;
}

const EVENT_LABELS: Record<string, string> = {
  START: "Gestartet",
  PAUSE: "Pause",
  RESUME: "Fortgesetzt",
  STOP: "Beendet",
};

interface TimerSessionsDialogProps {
  timerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimerSessionsDialog({ timerId, open, onOpenChange }: TimerSessionsDialogProps) {
  const [result, setResult] = useState<{ id: string; timer?: TimerDetail; error?: string } | null>(null);
  const timer = result?.id === timerId ? result.timer : null;
  const loading = open && !!timerId && result?.id !== timerId;
  useEffect(() => {
    if (!open || !timerId) return;
    const controller = new AbortController();
    fetch("/api/work-timers/" + timerId, { signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error("Timer konnte nicht geladen werden"); return r.json(); })
      .then(timer => setResult({ id: timerId, timer }))
      .catch(() => { if (!controller.signal.aborted) setResult({ id: timerId, error: "Timer konnte nicht geladen werden" }); });
    return () => controller.abort();
  }, [open, timerId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Timer-Sitzungen
          </DialogTitle>
        </DialogHeader>
        {loading && <p className="text-sm text-muted-foreground">Laden...</p>}
        {result?.id === timerId && result?.error && <p role="alert">{result.error}</p>}
        {timer && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium">{timer.user.name}</p>
              <p className="text-muted-foreground">{formatDateDE(timer.workDate)} · {timer.status}</p>
              {timer.timeEntry && (
                <p className="mt-1 tabular-nums">
                  Gesamt: {timer.timeEntry.totalHours.toFixed(2)}h · Pause:{" "}
                  {timer.timeEntry.breakMinutes} Min
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Arbeitssitzungen</p>
              {timer.segments.map((s) => (
                <div key={s.segmentOrder} className="rounded-lg border px-3 py-2 text-sm">
                  <span className="font-medium">
                    {s.startTime} – {s.endTime ?? "…"}
                  </span>
                  {s.durationMinutes != null && (
                    <span className="ml-2 text-muted-foreground">({s.durationMinutes} Min)</span>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Ereignisse</p>
              {timer.events.map((e, i) => (
                <div key={i} className="flex justify-between text-sm text-muted-foreground">
                  <span>{EVENT_LABELS[e.eventType] ?? e.eventType}</span>
                  <span className="font-mono">{e.timeOfDay}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
