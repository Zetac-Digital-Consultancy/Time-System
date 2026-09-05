import { redirect } from "next/navigation";
import { dashboardPath } from "@/lib/access-policy";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();
  if (!session) redirect("/login");
  redirect(session.user.mustChangePassword ? "/account/password" : dashboardPath(session.user.role));
}
