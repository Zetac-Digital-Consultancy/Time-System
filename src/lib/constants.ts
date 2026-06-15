export const STATUS_LABELS = {
  PENDING: "Ausstehend",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
} as const;

export const USER_STATUS_LABELS = {
  ACTIVE: "Aktiv",
  INACTIVE: "Inaktiv",
} as const;

export const ROLE_LABELS = {
  ADMIN: "Administrator",
  EMPLOYEE: "Mitarbeiter",
} as const;

export const NAV_ADMIN = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/admin/employees", label: "Mitarbeiter", icon: "Users" },
  { href: "/admin/time-entries", label: "Zeiteinträge", icon: "Clock" },
  { href: "/admin/baustellen", label: "Baustellen", icon: "Building2" },
  { href: "/admin/reports", label: "Berichte", icon: "FileText" },
  { href: "/admin/audit-logs", label: "Audit-Protokoll", icon: "ScrollText" },
] as const;

export const NAV_EMPLOYEE = [
  { href: "/employee/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/employee/time-entries", label: "Meine Zeiten", icon: "Clock" },
  { href: "/employee/notifications", label: "Benachrichtigungen", icon: "Bell" },
] as const;
