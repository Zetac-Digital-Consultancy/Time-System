import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/forms/password-form";
import { dashboardPath } from "@/lib/access-policy";
export default async function PasswordPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <PasswordForm backHref={session.user.mustChangePassword ? undefined : dashboardPath(session.user.role)} />;
}
