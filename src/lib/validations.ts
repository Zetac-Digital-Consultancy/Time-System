import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort ist erforderlich"),
});

const timeEntryBaseSchema = z
  .object({
    workDate: z.string().min(1, "Arbeitsdatum ist erforderlich"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
    breakMinutes: z.number().min(0).max(480),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      const [sh, sm] = data.startTime.split(":").map(Number);
      const [eh, em] = data.endTime.split(":").map(Number);
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      return end > start || end + 24 * 60 > start;
    },
    { message: "Endzeit muss nach Startzeit liegen", path: ["endTime"] }
  );

export const employeeTimeEntrySchema = timeEntryBaseSchema;

export const adminTimeEntrySchema = timeEntryBaseSchema.extend({
  baustelleId: z.string().optional().nullable(),
  userId: z.string().min(1, "Mitarbeiter ist erforderlich").optional(),
});

/** Unified schema for create/edit forms (baustelle optional in UI) */
export const timeEntryFormSchema = timeEntryBaseSchema.extend({
  baustelleId: z.string().optional().nullable(),
});

/** @deprecated Use employeeTimeEntrySchema or adminTimeEntrySchema */
export const timeEntrySchema = employeeTimeEntrySchema;

export const employeeSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen haben"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z
    .string()
    .min(8, "Passwort muss mindestens 8 Zeichen haben")
    .optional()
    .or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const baustelleSchema = z.object({
  name: z.string().min(2, "Name ist erforderlich"),
  address: z.string().optional(),
  description: z.string().optional(),
});

export const timeEntryFilterSchema = z.object({
  userId: z.string().optional(),
  baustelleId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type EmployeeTimeEntryInput = z.infer<typeof employeeTimeEntrySchema>;
export type AdminTimeEntryInput = z.infer<typeof adminTimeEntrySchema>;
export type TimeEntryFormInput = z.infer<typeof timeEntryFormSchema>;
export type TimeEntryInput = EmployeeTimeEntryInput;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type BaustelleInput = z.infer<typeof baustelleSchema>;
export type TimeEntryFilterInput = z.infer<typeof timeEntryFilterSchema>;
