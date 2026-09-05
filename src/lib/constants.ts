export const STATUS_LABELS = {
  PENDING: "Ausstehend",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
} as const;

export const USER_STATUS_LABELS = {
  ACTIVE: "Aktiv",
  INACTIVE: "Inaktiv",
} as const;

export const SOURCE_LABELS = {
  MANUAL: "Manuell",
  TIMER: "Timer",
} as const;

export const ROLE_LABELS = {
  ADMIN: "Administrator",
  EMPLOYEE: "Mitarbeiter",
} as const;

export const NAV_PLATFORM = [
  { href: "/platform/companies", label: "Firmen", icon: "Building2" },
  { href: "/account/password", label: "Passwort ändern", icon: "Users" },
] as const;

export const NAV_ADMIN = [
  { href: "/account/password", label: "Passwort ändern", icon: "Users" },
  { href: "/admin/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/admin/employees", label: "Mitarbeiter", icon: "Users" },
  { href: "/admin/time-entries", label: "Zeiteinträge", icon: "Clock" },
  { href: "/admin/timer-sessions", label: "Timer-Sitzungen", icon: "Timer" },
  { href: "/admin/baustellen", label: "Baustellen", icon: "Building2" },
  { href: "/admin/reports", label: "Berichte", icon: "FileText" },
  { href: "/admin/audit-logs", label: "Audit-Protokoll", icon: "ScrollText" },
] as const;

export const NAV_EMPLOYEE = [
  { href: "/account/password", label: "Passwort ändern", icon: "Users" },
  { href: "/employee/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/employee/time-entries", label: "Meine Zeiten", icon: "Clock" },
  { href: "/employee/notifications", label: "Benachrichtigungen", icon: "Bell" },
] as const;
