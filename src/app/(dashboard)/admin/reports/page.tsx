"use client";

import React, { useEffect, useState } from "react";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FilterPanel, PageSection } from "@/components/layout/device-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  totalHours: number;
  user?: { id: string; name: string };
  baustelle?: { id: string; name: string } | null;
}

type SiteAgg = { name: string; hours: number; entries: number };
type EmployeeAgg = { name: string; sites: Record<string, SiteAgg>; total: number; entries: number };

function aggregateEntries(entries: TimeEntry[]): Record<string, EmployeeAgg> {
  const agg: Record<string, EmployeeAgg> = {};
  for (const entry of entries) {
    const uid = entry.user?.id ?? "unknown";
    const uname = entry.user?.name ?? "Unbekannt";
    if (!agg[uid]) agg[uid] = { name: uname, sites: {}, total: 0, entries: 0 };
    const bid = entry.baustelle?.id ?? "none";
    const bname = entry.baustelle?.name ?? "Nicht zugewiesen";
    if (!agg[uid].sites[bid]) agg[uid].sites[bid] = { name: bname, hours: 0, entries: 0 };
    agg[uid].sites[bid].hours += entry.totalHours;
    agg[uid].sites[bid].entries += 1;
    agg[uid].total += entry.totalHours;
    agg[uid].entries += 1;
  }
  return agg;
}

function StatCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [selectedBaustelleId, setSelectedBaustelleId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportEntries, setReportEntries] = useState<TimeEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/baustellen").then((r) => r.json()),
    ]).then(([usersData, baustellenData]) => {
      setUsers(usersData);
      setBaustellen(baustellenData);
    });
  }, []);

  function buildFilters() {
    const f: Record<string, string> = {};
    if (selectedUserId !== "all") f.userId = selectedUserId;
    if (selectedBaustelleId !== "all") f.baustelleId = selectedBaustelleId;
    if (dateFrom) f.dateFrom = dateFrom;
    if (dateTo) f.dateTo = dateTo;
    return f;
  }

  async function loadReport() {
    setLoading(true);
    const params = new URLSearchParams(buildFilters());
    const res = await fetch(`/api/time-entries?${params}`);
    const data = await res.json();
    setReportEntries(data);
    setLoading(false);
  }

  function handleToday() {
    const today = new Date().toISOString().split("T")[0];
    setDateFrom(today);
    setDateTo(today);
  }

  function exportReport(format: "pdf" | "excel") {
    const params = new URLSearchParams({ ...buildFilters(), format });
    window.open(`/api/reports/export?${params}`, "_blank");
  }

  const agg = reportEntries ? aggregateEntries(reportEntries) : null;
  const totalHours = reportEntries?.reduce((s, e) => s + e.totalHours, 0) ?? 0;
  const uniqueEmployees = agg ? Object.keys(agg).length : 0;
  const uniqueBaustellen = agg
    ? new Set(Object.values(agg).flatMap((e) => Object.keys(e.sites))).size
    : 0;

  return (
    <PageSection>
      <PageHeader
        title="Berichte"
        description="Arbeitszeitberichte anzeigen und als PDF oder Excel exportieren"
      />

      <FilterPanel title="Filter">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="userId" className="text-sm font-medium">Mitarbeiter</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="userId">
                <SelectValue placeholder="Alle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="baustelleId" className="text-sm font-medium">Baustelle</Label>
            <Select value={selectedBaustelleId} onValueChange={setSelectedBaustelleId}>
              <SelectTrigger id="baustelleId">
                <SelectValue placeholder="Alle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                {baustellen.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dateFrom" className="text-sm font-medium">Von Datum</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dateTo" className="text-sm font-medium">Bis Datum</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={handleToday}>
            Heute
          </Button>
          <Button type="button" onClick={loadReport} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Wird geladen…" : "Bericht laden"}
          </Button>
        </div>
      </FilterPanel>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => exportReport("excel")}
          size="lg"
          className="w-full min-h-11 sm:w-auto"
        >
          <FileSpreadsheet className="h-5 w-5" />
          Excel exportieren
        </Button>
        <Button
          onClick={() => exportReport("pdf")}
          variant="outline"
          size="lg"
          className="w-full min-h-11 sm:w-auto"
        >
          <FileText className="h-5 w-5" />
          PDF exportieren
        </Button>
      </div>

      {reportEntries !== null && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              title="Gesamtstunden"
              value={`${totalHours.toFixed(2)}h`}
            />
            <StatCard
              title="Einträge"
              value={String(reportEntries.length)}
            />
            <StatCard
              title="Mitarbeiter"
              value={String(uniqueEmployees)}
            />
            <StatCard
              title="Baustellen"
              value={String(uniqueBaustellen)}
            />
          </div>

          {reportEntries.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-muted/30 py-12 text-center text-sm text-muted-foreground">
              Keine Einträge für die gewählten Filter gefunden.
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-0 pt-5">
                <CardTitle className="text-base">Auswertung nach Mitarbeiter</CardTitle>
              </CardHeader>
              <CardContent className="p-0 mt-4">
                {/* Mobile */}
                <div className="divide-y md:hidden">
                  {Object.entries(agg!).map(([uid, emp]) => (
                    <div key={uid} className="p-4">
                      <p className="mb-2 font-semibold text-sm">{emp.name}</p>
                      {Object.entries(emp.sites).map(([bid, site]) => (
                        <div key={bid} className="flex justify-between py-1 text-sm">
                          <span className="text-muted-foreground">{site.name}</span>
                          <span className="tabular-nums font-medium">
                            {site.hours.toFixed(2)}h ({site.entries})
                          </span>
                        </div>
                      ))}
                      <div className="mt-2 flex justify-between border-t pt-2 text-sm font-semibold">
                        <span>Gesamt</span>
                        <span className="tabular-nums">
                          {emp.total.toFixed(2)}h ({emp.entries})
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between bg-muted/30 p-4 text-sm font-bold">
                    <span>Gesamtsumme</span>
                    <span className="tabular-nums">
                      {totalHours.toFixed(2)}h ({reportEntries.length})
                    </span>
                  </div>
                </div>

                {/* Desktop */}
                <div className="hidden overflow-hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[28%]">Mitarbeiter</TableHead>
                        <TableHead className="w-[36%]">Baustelle</TableHead>
                        <TableHead className="w-[18%] text-right">Einträge</TableHead>
                        <TableHead className="w-[18%] text-right">Stunden</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(agg!).map(([uid, emp]) => (
                        <React.Fragment key={uid}>
                          {Object.entries(emp.sites).map(([bid, site]) => (
                            <TableRow key={`${uid}-${bid}`}>
                              <TableCell className="font-medium">{emp.name}</TableCell>
                              <TableCell className="text-muted-foreground">{site.name}</TableCell>
                              <TableCell className="text-right tabular-nums">{site.entries}</TableCell>
                              <TableCell className="text-right tabular-nums">{site.hours.toFixed(2)}h</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/40">
                            <TableCell colSpan={2} className="text-xs font-semibold text-muted-foreground">
                              Σ {emp.name}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold tabular-nums">
                              {emp.entries}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold tabular-nums">
                              {emp.total.toFixed(2)}h
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))}
                      <TableRow className="border-t-2 font-bold">
                        <TableCell colSpan={2}>Gesamtsumme</TableCell>
                        <TableCell className="text-right tabular-nums">{reportEntries.length}</TableCell>
                        <TableCell className="text-right tabular-nums">{totalHours.toFixed(2)}h</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </PageSection>
  );
}
