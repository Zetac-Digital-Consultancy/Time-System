import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { dashboardPath } from "@/lib/access-policy";
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PLATFORM_ADMIN") redirect(dashboardPath(session.user.role));
  return children;
}
