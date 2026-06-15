"use client";

import { useEffect, useState } from "react";
import { Users, Clock, Building2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSection, SplitGrid, StatGrid } from "@/components/layout/device-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateDE } from "@/lib/utils";

interface DashboardData {
  totalEmployees: number;
  todayHours: string;
  weekHours: string;
  recentEntries: Array<{
    id: string;
    workDate: string;
    startTime: string;
    endTime: string;
    totalHours: number;
    user: { name: string };
    baustelle?: { name: string } | null;
  }>;
  hoursByEmployee: Array<{ name: string; formatted: string; hours: number }>;
  hoursByBaustelle: Array<{ name: string; formatted: string; hours: number }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/admin")
      .then(async (response) => {
        if (response.status === 401) {
          window.location.href = "/login";
          return null;
        }
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? "Dashboard konnte nicht geladen werden");
        }
        return response.json() as Promise<DashboardData>;
      })
      .then((result) => {
        if (result) setData(result);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return <div className="text-destructive">{error}</div>;
  }

  if (!data) {
    return <div className="text-muted-foreground">Dashboard wird geladen...</div>;
  }

  return (
    <PageSection>
      <PageHeader
        title="Admin Dashboard"
        description="Unternehmensübersicht und Kennzahlen"
      />

      <StatGrid>
        <StatCard title="Aktive Mitarbeiter" value={data.totalEmployees} icon={Users} />
        <StatCard title="Stunden heute" value={data.todayHours} icon={Clock} />
        <StatCard title="Stunden diese Woche" value={data.weekHours} icon={Building2} />
      </StatGrid>

      <SplitGrid>
        <Card>
          <CardHeader className="pb-2 xl:pb-2">
            <CardTitle>Stunden pro Mitarbeiter (Monat)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 xl:space-y-2">
            {data.hoursByEmployee.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5 text-sm hover:bg-muted/50 xl:text-[13px] 2xl:text-sm"
              >
                <span className="truncate font-medium">{item.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{item.formatted}</span>
              </div>
            ))}
            {data.hoursByEmployee.length === 0 && (
              <p className="text-sm text-muted-foreground">Keine Daten</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 xl:pb-2">
            <CardTitle>Stunden pro Baustelle (Monat)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 xl:space-y-2">
            {data.hoursByBaustelle.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5 text-sm hover:bg-muted/50 xl:text-[13px] 2xl:text-sm"
              >
                <span className="truncate font-medium">{item.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{item.formatted}</span>
              </div>
            ))}
            {data.hoursByBaustelle.length === 0 && (
              <p className="text-sm text-muted-foreground">Keine Daten</p>
            )}
          </CardContent>
        </Card>
      </SplitGrid>

      <Card>
        <CardHeader className="pb-2 xl:pb-2">
          <CardTitle>Letzte Zeiteinträge</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 xl:space-y-1.5 2xl:space-y-2">
            {data.recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border px-3 py-2.5 md:p-4 xl:px-3 xl:py-2.5 2xl:p-4"
              >
                <p className="font-medium text-sm xl:text-[13px] 2xl:text-base">{entry.user.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground xl:text-[12px] 2xl:text-sm">
                  <span className="md:hidden">
                    {formatDateDE(entry.workDate)} · {entry.totalHours.toFixed(2)}h
                  </span>
                  <span className="hidden md:inline">
                    {formatDateDE(entry.workDate)} · {entry.startTime}–{entry.endTime} ·{" "}
                    <span className="tabular-nums">{entry.totalHours.toFixed(2)}h</span>
                    {" · "}
                    {entry.baustelle?.name ?? "Keine Baustelle"}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageSection>
  );
}
