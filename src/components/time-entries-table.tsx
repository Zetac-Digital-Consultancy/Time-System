"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Timer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataListActions, DataListCard, DataListRow } from "@/components/ui/data-list-card";
import { TimeEntryForm } from "@/components/forms/time-entry-form";
import { TimerSessionsDialog } from "@/components/work-timer/timer-sessions-dialog";
import { SOURCE_LABELS } from "@/lib/constants";
import { formatDateDE } from "@/lib/utils";

interface TimeEntry {
  id: string;
  workDate: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  totalHours: number;
  notes: string | null;
  source?: "MANUAL" | "TIMER";
  user?: { id: string; name: string; email: string };
  baustelle?: { id: string; name: string } | null;
  workTimer?: { id: string } | null;
}

interface TimeEntriesTableProps {
  showEmployee?: boolean;
  isAdmin?: boolean;
  filters?: Record<string, string>;
}

export function TimeEntriesTable({
  showEmployee = false,
  isAdmin = false,
  filters = {},
}: TimeEntriesTableProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [timerDialogId, setTimerDialogId] = useState<string | null>(null);
  const [timerDialogOpen, setTimerDialogOpen] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams(filters);
    const res = await fetch(`/api/time-entries?${params}`);
    const data = await res.json();
    setEntries(data);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function handleDelete(id: string) {
    if (!confirm("Eintrag wirklich löschen?")) return;
    await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
    fetchEntries();
  }

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Laden...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Keine Zeiteinträge gefunden.
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {entries.map((entry) => (
          <DataListCard key={entry.id}>
            {showEmployee && entry.user && (
              <p className="mb-2 font-semibold">{entry.user.name}</p>
            )}
            <DataListRow label="Datum" value={formatDateDE(entry.workDate)} />
            <DataListRow label="Zeit" value={`${entry.startTime} – ${entry.endTime}`} />
            <DataListRow label="Pause" value={`${entry.breakMinutes} Min`} />
            <DataListRow label="Stunden" value={`${entry.totalHours.toFixed(2)}h`} />
            {entry.source && (
              <DataListRow label="Quelle" value={SOURCE_LABELS[entry.source]} />
            )}
            <DataListRow label="Baustelle" value={entry.baustelle?.name ?? "–"} />
            {entry.notes && <DataListRow label="Notizen" value={entry.notes} />}
            <DataListActions>
              {isAdmin && entry.workTimer && (
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Timer-Sitzungen"
                  onClick={() => {
                    setTimerDialogId(entry.workTimer!.id);
                    setTimerDialogOpen(true);
                  }}
                >
                  <Timer className="h-4 w-4" />
                </Button>
              )}
              <Button size="icon" variant="outline" onClick={() => setEditEntry(entry)} aria-label="Bearbeiten">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => handleDelete(entry.id)} aria-label="Löschen">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </DataListActions>
          </DataListCard>
        ))}
      </div>

      {/* Tablet + Laptop + Desktop: data table */}
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {showEmployee && <TableHead className="w-[18%] xl:w-[16%]">Mitarbeiter</TableHead>}
              <TableHead className="w-[14%] xl:w-[12%]">Datum</TableHead>
              <TableHead className="w-[18%] xl:w-[16%]">Zeit</TableHead>
              <TableHead className="w-[10%] xl:w-[9%]">Pause</TableHead>
              <TableHead className="w-[10%] xl:w-[9%]">Stunden</TableHead>
              <TableHead className="w-[8%]">Quelle</TableHead>
              <TableHead className={showEmployee ? "w-[16%]" : "w-[24%]"}>Baustelle</TableHead>
              <TableHead className="w-[10%] text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                {showEmployee && (
                  <TableCell className="font-medium">
                    <span className="line-clamp-1">{entry.user?.name}</span>
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap">{formatDateDE(entry.workDate)}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {entry.startTime} – {entry.endTime}
                </TableCell>
                <TableCell className="tabular-nums">{entry.breakMinutes} Min</TableCell>
                <TableCell className="font-medium tabular-nums">{entry.totalHours.toFixed(2)}h</TableCell>
                <TableCell>
                  {entry.source ? (
                    <span
                      className={
                        entry.source === "TIMER"
                          ? "rounded bg-primary/10 px-2 py-0.5 text-xs text-primary"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      {SOURCE_LABELS[entry.source]}
                    </span>
                  ) : (
                    "–"
                  )}
                </TableCell>
                <TableCell>
                  <span className="line-clamp-1">{entry.baustelle?.name ?? "–"}</span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {isAdmin && entry.workTimer && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Timer-Sitzungen"
                        onClick={() => {
                          setTimerDialogId(entry.workTimer!.id);
                          setTimerDialogOpen(true);
                        }}
                      >
                        <Timer className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => setEditEntry(entry)} aria-label="Bearbeiten">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(entry.id)} aria-label="Löschen">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zeiteintrag bearbeiten</DialogTitle>
          </DialogHeader>
          {editEntry && (
            <TimeEntryForm
              mode="edit"
              allowBaustelle={isAdmin}
              initialData={{
                id: editEntry.id,
                workDate: new Date(editEntry.workDate).toISOString().split("T")[0],
                startTime: editEntry.startTime,
                endTime: editEntry.endTime,
                breakMinutes: editEntry.breakMinutes,
                notes: editEntry.notes ?? "",
                baustelleId: editEntry.baustelle?.id,
              }}
              onSuccess={() => {
                setEditEntry(null);
                fetchEntries();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <TimerSessionsDialog
        timerId={timerDialogId}
        open={timerDialogOpen}
        onOpenChange={setTimerDialogOpen}
      />
    </>
  );
}
