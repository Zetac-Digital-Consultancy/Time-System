"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { FilterPanel, PageSection } from "@/components/layout/device-layout";
import { TimeEntryForm } from "@/components/forms/time-entry-form";
import { TimeEntriesTable } from "@/components/time-entries-table";
import { getTodayDateString, TimeEntryDateFilters } from "@/components/time-entry-date-filters";

export default function EmployeeTimeEntriesPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

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

  return (
    <PageSection className="pb-20 md:pb-0">
      <PageHeader
        title="Meine Zeiteinträge"
        description="Erfassen und verwalten Sie Ihre Arbeitszeiten"
        action={<TimeEntryForm mobileFab onSuccess={() => window.location.reload()} />}
        hideMobileAction
      />

      <FilterPanel>
        <TimeEntryDateFilters
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onToday={handleToday}
        />
      </FilterPanel>

      <TimeEntriesTable filters={filters} />
    </PageSection>
  );
}
