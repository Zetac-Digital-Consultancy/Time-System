"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, Sun } from "lucide-react";
import { PageHeader, PageStatusMessage } from "@/components/layout/page-header";
import { PageSection, StatGrid } from "@/components/layout/device-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeEntryForm } from "@/components/forms/time-entry-form";
import { formatDateDE } from "@/lib/utils";

interface DashboardData {
  todayEntries: Array<{
    id: string;
    workDate: string;
    startTime: string;
    endTime: string;
    totalHours: number;
    baustelle?: { name: string } | null;
  }>;
  todayHours: string;
  weekHours: string;
  monthHours: string;
}

export default function EmployeeDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/employee")
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
    return (
      <PageSection className="pb-20 md:pb-0">
        <PageHeader title="Mein Dashboard" description="Übersicht Ihrer Arbeitszeiten" />
        <PageStatusMessage variant="error">{error}</PageStatusMessage>
      </PageSection>
    );
  }

  if (!data) {
    return (
      <PageSection className="pb-20 md:pb-0">
        <PageHeader title="Mein Dashboard" description="Übersicht Ihrer Arbeitszeiten" />
        <PageStatusMessage>Dashboard wird geladen...</PageStatusMessage>
      </PageSection>
    );
  }

  return (
    <PageSection className="pb-20 md:pb-0">
      <PageHeader
        title="Mein Dashboard"
        description="Übersicht Ihrer Arbeitszeiten"
        action={<TimeEntryForm mobileFab onSuccess={() => window.location.reload()} />}
        hideMobileAction
      />

      <StatGrid>
        <StatCard title="Stunden heute" value={data.todayHours} icon={Sun} />
        <StatCard title="Stunden diese Woche" value={data.weekHours} icon={Clock} />
        <StatCard title="Stunden dieser Monat" value={data.monthHours} icon={Calendar} />
      </StatGrid>

      <Card>
        <CardHeader className="pb-2 xl:pb-2">
          <CardTitle>Letzte Zeiteinträge</CardTitle>
        </CardHeader>
        <CardContent>
          {data.todayEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Einträge für heute.</p>
          ) : (
            <div className="space-y-2 xl:space-y-1.5 2xl:space-y-2">
              {data.todayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border px-3 py-2.5 md:p-4 xl:px-3 xl:py-2.5 2xl:p-4"
                >
                  <p className="font-medium text-sm xl:text-[13px] 2xl:text-base">
                    {entry.startTime} – {entry.endTime}
                    <span className="ml-2 font-normal tabular-nums text-muted-foreground">
                      {entry.totalHours.toFixed(2)}h
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground xl:text-[12px] 2xl:text-sm">
                    {formatDateDE(entry.workDate)} ·{" "}
                    {entry.baustelle?.name ?? "Baustelle noch nicht zugewiesen"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageSection>
  );
}
