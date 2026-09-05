import { z } from "zod";

export const passwordSchema = z.string().min(15, "Mindestens 15 Zeichen verwenden")
  .refine(value => new TextEncoder().encode(value).length <= 72, "Maximal 72 UTF-8-Bytes verwenden");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ungültige E-Mail-Adresse").max(254),
  password: z.string().min(1, "Passwort ist erforderlich").max(256),
  otp: z.string().max(6).optional(),
});

const timeEntryBaseSchema = z
  .object({
    workDate: z.iso.date("Gültiges Arbeitsdatum ist erforderlich"),
    startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Gültige Uhrzeit HH:MM erforderlich"),
    endTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Gültige Uhrzeit HH:MM erforderlich"),
    breakMinutes: z.number().int().min(0).max(480),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      const [sh, sm] = data.startTime.split(":").map(Number);
      const [eh, em] = data.endTime.split(":").map(Number);
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      const duration = (end - start + 24 * 60) % (24 * 60);
      return duration > 0 && data.breakMinutes <= duration;
    },
    { message: "Arbeitsdauer muss positiv sein; Pause darf sie nicht überschreiten", path: ["endTime"] }
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
  name: z.string().trim().min(2, "Name muss mindestens 2 Zeichen haben").max(150),
  email: z.string().trim().toLowerCase().email("Ungültige E-Mail-Adresse").max(254),
  password: passwordSchema
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
