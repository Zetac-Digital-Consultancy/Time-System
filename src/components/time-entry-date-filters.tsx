"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

interface TimeEntryDateFiltersProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onToday: () => void;
  className?: string;
}

function FilterField({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium leading-none">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function TimeEntryDateFilters({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onToday,
  className,
}: TimeEntryDateFiltersProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4",
        "sm:grid-cols-2",
        "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end md:gap-3",
        "xl:gap-3",
        "2xl:gap-4",
        className
      )}
    >
      <FilterField label="Von Datum" htmlFor="dateFrom">
        <Input
          id="dateFrom"
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
        />
      </FilterField>

      <FilterField label="Bis Datum" htmlFor="dateTo">
        <Input
          id="dateTo"
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
        />
      </FilterField>

      <div className="grid gap-2 sm:col-span-2 md:col-span-1">
        <Label
          className="hidden text-sm font-medium leading-none md:block md:invisible md:select-none"
          aria-hidden="true"
        >
          Heute
        </Label>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full md:w-auto xl:h-9 xl:min-w-[5.5rem] 2xl:h-10"
          onClick={onToday}
        >
          Heute
        </Button>
      </div>
    </div>
  );
}
