"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type AdminTimeEntryInput,
  type TimeEntryFormInput,
  timeEntryFormSchema,
} from "@/lib/validations";
import { FormGrid } from "@/components/layout/device-layout";
import { calculateTotalHours } from "@/lib/time-utils";
import { cn } from "@/lib/utils";

const BAUSTELLE_NONE = "__none__";

interface Baustelle {
  id: string;
  name: string;
}

type TimeEntryFormData = TimeEntryFormInput;

interface TimeEntryFormProps {
  onSuccess?: () => void;
  initialData?: Partial<TimeEntryFormData & { id: string }>;
  mode?: "create" | "edit";
  allowBaustelle?: boolean;
  /** Show floating action button on mobile (< md) */
  mobileFab?: boolean;
}

export function TimeEntryForm({
  onSuccess,
  initialData,
  mode = "create",
  allowBaustelle = false,
  mobileFab = false,
}: TimeEntryFormProps) {
  const [open, setOpen] = useState(false);
  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntryFormSchema),
    defaultValues: {
      workDate: initialData?.workDate ?? new Date().toISOString().split("T")[0],
      startTime: initialData?.startTime ?? "08:00",
      endTime: initialData?.endTime ?? "17:00",
      breakMinutes: initialData?.breakMinutes ?? 30,
      notes: initialData?.notes ?? "",
      baustelleId: initialData?.baustelleId ?? undefined,
    },
  });

  const startTime = watch("startTime");
  const endTime = watch("endTime");
  const breakMinutes = watch("breakMinutes");
  const preview = calculateTotalHours(startTime, endTime, breakMinutes);

  useEffect(() => {
    if (!allowBaustelle) return;
    fetch("/api/baustellen")
      .then((r) => r.json())
      .then(setBaustellen);
  }, [allowBaustelle]);

  useEffect(() => {
    if (initialData && mode === "edit") {
      reset({
        workDate: initialData.workDate,
        startTime: initialData.startTime,
        endTime: initialData.endTime,
        breakMinutes: initialData.breakMinutes,
        notes: initialData.notes,
        baustelleId: initialData.baustelleId,
      });
    }
  }, [initialData, mode, reset]);

  async function onSubmit(data: TimeEntryFormData) {
    setError("");
    const url =
      mode === "edit" && initialData?.id
        ? `/api/time-entries/${initialData.id}`
        : "/api/time-entries";
    const method = mode === "edit" ? "PATCH" : "POST";

    const payload: Record<string, unknown> = {
      workDate: data.workDate,
      startTime: data.startTime,
      endTime: data.endTime,
      breakMinutes: data.breakMinutes,
      notes: data.notes,
    };

    if (allowBaustelle) {
      const baustelleId = (data as AdminTimeEntryInput).baustelleId;
      payload.baustelleId = baustelleId && baustelleId !== BAUSTELLE_NONE ? baustelleId : null;
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error?.message ?? err.error ?? "Fehler beim Speichern");
      return;
    }

    reset();
    setOpen(false);
    onSuccess?.();
  }

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 space-y-4 [&_input]:min-w-0 [&_input]:max-w-full [&_textarea]:min-w-0 [&_textarea]:max-w-full [&_textarea]:resize-y xl:space-y-3 2xl:space-y-4">
      <FormGrid className="min-w-0 [&>div]:min-w-0">
        <div className="space-y-2">
          <Label htmlFor="workDate">Arbeitsdatum</Label>
          <Input id="workDate" type="date" {...register("workDate")} />
          {errors.workDate && <p className="text-sm text-destructive">{errors.workDate.message}</p>}
        </div>
        {allowBaustelle && (
          <div className="space-y-2">
            <Label>Baustelle</Label>
            <Select
              value={watch("baustelleId") || BAUSTELLE_NONE}
              onValueChange={(v) =>
                setValue("baustelleId", v === BAUSTELLE_NONE ? undefined : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Baustelle zuweisen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BAUSTELLE_NONE}>Keine Baustelle</SelectItem>
                {baustellen.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="startTime">Startzeit</Label>
          <Input id="startTime" type="time" {...register("startTime")} />
          {errors.startTime && <p className="text-sm text-destructive">{errors.startTime.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">Endzeit</Label>
          <Input id="endTime" type="time" {...register("endTime")} />
          {errors.endTime && <p className="text-sm text-destructive">{errors.endTime.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="breakMinutes">Pause (Minuten)</Label>
          <Input id="breakMinutes" type="number" min={0} {...register("breakMinutes", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label>Berechnete Stunden</Label>
          <div className="flex h-10 items-center rounded-lg border bg-muted px-3 text-sm xl:h-9 2xl:h-10">
            {preview.toFixed(2)}h
          </div>
        </div>
      </FormGrid>
      <div className="space-y-2">
        <Label htmlFor="notes">Notizen (optional)</Label>
        <Textarea id="notes" placeholder="Optionale Notizen..." {...register("notes")} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full min-h-11 md:min-h-0">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "edit" ? "Aktualisieren" : "Einreichen"}
      </Button>
    </form>
  );

  if (mode === "edit") return formContent;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className={cn(mobileFab && "hidden md:inline-flex")}>
            <Plus className="h-4 w-4" />
            Neue Zeiterfassung
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Arbeitszeit erfassen</DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>

      {mobileFab && (
        <div className="safe-bottom fixed bottom-5 right-4 z-30 md:hidden">
          <Button
            size="lg"
            className="h-14 gap-2 rounded-full px-5 shadow-lg"
            onClick={() => setOpen(true)}
            aria-label="Neue Zeiterfassung"
          >
            <Plus className="h-5 w-5" />
            Zeit erfassen
          </Button>
        </div>
      )}
    </>
  );
}
