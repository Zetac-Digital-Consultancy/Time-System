export function dashboardPath(role: string | undefined) {
  if (role === "PLATFORM_ADMIN") return "/platform/companies";
  return role === "ADMIN" ? "/admin/dashboard" : "/employee/dashboard";
}
export function accountIsActive(user: {
  status: string; role: string; companyId: string | null; company: { status: string } | null;
}) {
  return user.status === "ACTIVE" && (user.role === "PLATFORM_ADMIN"
    ? user.companyId === null
    : !!user.companyId && user.company?.status === "ACTIVE");
}
export function sessionIsCurrent(token: { sessionVersion?: number; role?: string; companyId?: string | null },
  user: Parameters<typeof accountIsActive>[0] & { sessionVersion: number }) {
  return accountIsActive(user) && token.sessionVersion === user.sessionVersion &&
    token.role === user.role && token.companyId === user.companyId;
}
// A missing company must never become an omitted database filter.
export function tenantId(user: { role: string; companyId: string | null }) {
  if (user.role === "PLATFORM_ADMIN" || !user.companyId) throw new Error("Company access required");
  return user.companyId;
}
