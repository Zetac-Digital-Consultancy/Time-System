"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FilterPanel, PageSection } from "@/components/layout/device-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataListCard, DataListRow, DataListActions } from "@/components/ui/data-list-card";
import { TimeEntryDateFilters, getTodayDateString } from "@/components/time-entry-date-filters";
import { SOURCE_LABELS } from "@/lib/constants";
import { formatDateDE } from "@/lib/utils";

interface User {
  id: string;
  name: string;
}

interface Baustelle {
  id: string;
  name: string;
}

interface TimeEntry {
  id: string;
  workDate: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  source: "MANUAL" | "TIMER";
  user: { id: string; name: string };
  baustelle: { id: string; name: string } | null;
}

const NONE = "__none__";

function BaustelleSelect({
  entryId,
  currentId,
  baustellen,
  onAssigned,
}: {
  entryId: string;
  currentId: string | null;
  baustellen: Baustelle[];
  onAssigned: (entryId: string, baustelle: Baustelle | null) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleChange(value: string) {
    const baustelleId = value === NONE ? null : value;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/time-entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baustelleId }),
      });
      if (res.ok) {
        const newBaustelle = baustelleId
          ? (baustellen.find((b) => b.id === baustelleId) ?? null)
          : null;
        onAssigned(entryId, newBaustelle);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select value={currentId ?? NONE} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="h-8 w-full min-w-[9rem] max-w-[14rem] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>
            <span className="text-muted-foreground">— Nicht zugewiesen —</span>
          </SelectItem>
          {baustellen.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {saving && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
      {saved && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />}
    </div>
  );
}

export default function AdminTimeEntriesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState("all");
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/baustellen").then((r) => r.json()),
    ]).then(([u, b]) => {
      setUsers(u);
      setBaustellen(b);
    });
  }, []);

  const loadEntries = useCallback(async () => {
    const params = new URLSearchParams();
    if (userId !== "all") params.set("userId", userId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const data: TimeEntry[] = await fetch(`/api/time-entries?${params}`).then((r) => r.json());
    setEntries(data);
    setLoading(false);
  }, [userId, dateFrom, dateTo]);

  useEffect(() => {
    // State updates happen after the awaited network response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEntries();
  }, [loadEntries]);

  function handleToday() {
    const today = getTodayDateString();
    setDateFrom(today);
    setDateTo(today);
  }

  function handleAssigned(entryId: string, baustelle: Baustelle | null) {
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, baustelle } : e))
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Eintrag wirklich löschen?")) return;
    await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const displayed = onlyUnassigned ? entries.filter((e) => !e.baustelle) : entries;
  const unassignedCount = entries.filter((e) => !e.baustelle).length;

  return (
    <PageSection>
      <PageHeader
        title="Zeiteinträge"
        description="Erfasste Arbeitszeiten der Mitarbeiter – Baustelle direkt in der Tabelle zuweisen"
      />

      <FilterPanel title="Filter">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Mitarbeiter</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Alle Mitarbeiter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end pb-0.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={onlyUnassigned}
                onChange={(e) => setOnlyUnassigned(e.target.checked)}
              />
              <span>Nur nicht zugewiesene anzeigen</span>
              {unassignedCount > 0 && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                  {unassignedCount}
                </span>
              )}
            </label>
          </div>
        </div>

        <TimeEntryDateFilters
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onToday={handleToday}
        />
      </FilterPanel>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Laden…</div>
      ) : displayed.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-muted/30 py-12 text-center text-sm text-muted-foreground">
          {onlyUnassigned
            ? "Alle Einträge sind bereits einer Baustelle zugewiesen."
            : "Keine Zeiteinträge gefunden."}
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 md:hidden">
            {displayed.map((entry) => (
              <DataListCard key={entry.id}>
                <p className="mb-2 font-semibold">{entry.user.name}</p>
                <DataListRow label="Datum" value={formatDateDE(entry.workDate)} />
                <DataListRow
                  label="Arbeitszeit"
                  value={`${entry.startTime} – ${entry.endTime}`}
                />
                <DataListRow
                  label="Stunden"
                  value={`${entry.totalHours.toFixed(2)}h`}
                />
                <DataListRow label="Quelle" value={SOURCE_LABELS[entry.source]} />
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Baustelle zuweisen
                  </p>
                  <BaustelleSelect
                    entryId={entry.id}
                    currentId={entry.baustelle?.id ?? null}
                    baustellen={baustellen}
                    onAssigned={handleAssigned}
                  />
                </div>
                <DataListActions>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Löschen"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </DataListActions>
              </DataListCard>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[18%]">Mitarbeiter</TableHead>
                  <TableHead className="w-[12%]">Datum</TableHead>
                  <TableHead className="w-[14%]">Arbeitszeit</TableHead>
                  <TableHead className="w-[8%]">Stunden</TableHead>
                  <TableHead className="w-[8%]">Quelle</TableHead>
                  <TableHead>Baustelle zuweisen</TableHead>
                  <TableHead className="w-[5%] text-right">Löschen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayed.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className={
                      !entry.baustelle
                        ? "bg-orange-50/50 dark:bg-orange-950/10"
                        : undefined
                    }
                  >
                    <TableCell className="font-medium">
                      <span className="line-clamp-1">{entry.user.name}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateDE(entry.workDate)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {entry.startTime} – {entry.endTime}
                    </TableCell>
                    <TableCell className="tabular-nums font-medium">
                      {entry.totalHours.toFixed(2)}h
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          entry.source === "TIMER"
                            ? "rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {SOURCE_LABELS[entry.source]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <BaustelleSelect
                        entryId={entry.id}
                        currentId={entry.baustelle?.id ?? null}
                        baustellen={baustellen}
                        onAssigned={handleAssigned}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Löschen"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </PageSection>
  );
}
