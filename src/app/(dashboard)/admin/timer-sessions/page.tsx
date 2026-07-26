"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { FilterPanel, PageSection } from "@/components/layout/device-layout";
import { Card, CardContent } from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { DataListCard, DataListRow } from "@/components/ui/data-list-card";
import { TimerSessionsDialog } from "@/components/work-timer/timer-sessions-dialog";
import { TimeEntryDateFilters, getTodayDateString } from "@/components/time-entry-date-filters";
import { formatDateDE } from "@/lib/utils";

interface User {
  id: string;
  name: string;
}

interface WorkTimerRow {
  id: string;
  workDate: string;
  status: string;
  user: { id: string; name: string };
  segments: Array<{ segmentOrder: number; startTime: string; endTime: string | null }>;
  timeEntry: {
    id: string;
    totalHours: number;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    baustelle?: { name: string } | null;
  } | null;
}

export default function AdminTimerSessionsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [timers, setTimers] = useState<WorkTimerRow[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userId, setUserId] = useState("all");
  const [selectedTimerId, setSelectedTimerId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (userId !== "all") params.set("userId", userId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    fetch(`/api/work-timers?${params}`)
      .then((r) => r.json())
      .then(setTimers);
  }, [userId, dateFrom, dateTo]);

  function handleToday() {
    const today = getTodayDateString();
    setDateFrom(today);
    setDateTo(today);
  }

  return (
    <PageSection>
      <PageHeader
        title="Timer-Sitzungen"
        description="Detaillierte Timer-Sitzungen der Mitarbeiter mit Segmenten und Ereignisprotokoll"
      />

      <FilterPanel title="Filter">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Mitarbeiter</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Alle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      <div className="space-y-3 md:hidden">
        {timers.map((timer) => (
          <DataListCard key={timer.id}>
            <p className="mb-2 font-semibold">{timer.user.name}</p>
            <DataListRow label="Datum" value={formatDateDE(timer.workDate)} />
            <DataListRow label="Status" value={timer.status} />
            <DataListRow label="Sitzungen" value={timer.segments.length} />
            <DataListRow
              label="Stunden"
              value={timer.timeEntry ? `${timer.timeEntry.totalHours.toFixed(2)}h` : "–"}
            />
            <Button
              className="mt-2 w-full"
              variant="outline"
              onClick={() => {
                setSelectedTimerId(timer.id);
                setDialogOpen(true);
              }}
            >
              Details anzeigen
            </Button>
          </DataListCard>
        ))}
      </div>

      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mitarbeiter</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sitzungen</TableHead>
                <TableHead>Stunden</TableHead>
                <TableHead>Baustelle</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timers.map((timer) => (
                <TableRow key={timer.id}>
                  <TableCell className="font-medium">{timer.user.name}</TableCell>
                  <TableCell>{formatDateDE(timer.workDate)}</TableCell>
                  <TableCell>{timer.status}</TableCell>
                  <TableCell>{timer.segments.length}</TableCell>
                  <TableCell className="tabular-nums">
                    {timer.timeEntry ? `${timer.timeEntry.totalHours.toFixed(2)}h` : "–"}
                  </TableCell>
                  <TableCell>{timer.timeEntry?.baustelle?.name ?? "–"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedTimerId(timer.id);
                        setDialogOpen(true);
                      }}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {timers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Keine Timer-Sitzungen gefunden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TimerSessionsDialog
        timerId={selectedTimerId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </PageSection>
  );
}
