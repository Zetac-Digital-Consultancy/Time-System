"use client";

import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FilterPanel, PageSection } from "@/components/layout/device-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTodayDateString, TimeEntryDateFilters } from "@/components/time-entry-date-filters";

interface User {
  id: string;
  name: string;
}

interface Baustelle {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/baustellen").then((r) => r.json()),
    ]).then(([usersData, baustellenData]) => {
      setUsers(usersData);
      setBaustellen(baustellenData);
    });
  }, []);

  function updateFilter(key: string, value: string) {
    setFilters((prev) => {
      const next = { ...prev };
      if (value && value !== "all") next[key] = value;
      else delete next[key];
      return next;
    });
  }

  useEffect(() => {
    setFilters((prev) => {
      const next = { ...prev };
      if (dateFrom) next.dateFrom = dateFrom;
      else delete next.dateFrom;
      if (dateTo) next.dateTo = dateTo;
      else delete next.dateTo;
      return next;
    });
  }, [dateFrom, dateTo]);

  function handleToday() {
    const today = getTodayDateString();
    setDateFrom(today);
    setDateTo(today);
  }

  function exportReport(format: "pdf" | "excel") {
    const params = new URLSearchParams({ ...filters, format });
    window.open(`/api/reports/export?${params}`, "_blank");
  }

  return (
    <PageSection>
      <PageHeader
        title="Berichte"
        description="Arbeitszeitberichte exportieren als PDF oder Excel"
      />

      <FilterPanel title="Filter">
        <div className="grid gap-4 md:grid-cols-2 xl:gap-3 2xl:gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Mitarbeiter</Label>
              <Select onValueChange={(v) => updateFilter("userId", v)}>
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
          <div className="space-y-2">
            <Label className="text-sm font-medium">Baustelle</Label>
              <Select onValueChange={(v) => updateFilter("baustelleId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  {baustellen.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-3 xl:flex xl:flex-wrap xl:gap-3 2xl:gap-4">
        <Button onClick={() => exportReport("excel")} size="lg" className="w-full min-h-11 md:w-auto">
          <FileSpreadsheet className="h-5 w-5" />
          Excel exportieren
        </Button>
        <Button onClick={() => exportReport("pdf")} variant="outline" size="lg" className="w-full min-h-11 md:w-auto">
          <FileText className="h-5 w-5" />
          PDF exportieren
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-start gap-4 p-4 text-muted-foreground md:flex-row md:items-center md:p-6">
          <Download className="h-8 w-8" />
          <p className="text-sm">
            Wählen Sie optional Filter aus und klicken Sie auf den gewünschten Export-Button.
            Die Berichte enthalten Mitarbeiter, Datum, Arbeitszeiten und Baustellen.
          </p>
        </CardContent>
      </Card>
    </PageSection>
  );
}
