"use client";

import { useCallback, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { FilterPanel, PageSection } from "@/components/layout/device-layout";
import { TimeEntriesTable } from "@/components/time-entries-table";
import { getTodayDateString, TimeEntryDateFilters } from "@/components/time-entry-date-filters";

interface User {
  id: string;
  name: string;
}

interface Baustelle {
  id: string;
  name: string;
}

export default function AdminTimeEntriesPage() {
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

  const updateFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value && value !== "all") next[key] = value;
      else delete next[key];
      return next;
    });
  }, []);

  const applyDateFilters = useCallback((from: string, to: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (from) next.dateFrom = from;
      else delete next.dateFrom;
      if (to) next.dateTo = to;
      else delete next.dateTo;
      return next;
    });
  }, []);

  useEffect(() => {
    applyDateFilters(dateFrom, dateTo);
  }, [dateFrom, dateTo, applyDateFilters]);

  function handleToday() {
    const today = getTodayDateString();
    setDateFrom(today);
    setDateTo(today);
  }

  return (
    <PageSection>
      <PageHeader
        title="Zeiteinträge"
        description="Alle Arbeitszeiten verwalten, filtern und Baustellen zuweisen"
      />

      <FilterPanel title="Filter">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2 xl:gap-3 2xl:grid-cols-2 2xl:gap-4">
          <div className="grid gap-2">
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
          <div className="grid gap-2">
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

      <TimeEntriesTable showEmployee isAdmin filters={filters} />
    </PageSection>
  );
}
