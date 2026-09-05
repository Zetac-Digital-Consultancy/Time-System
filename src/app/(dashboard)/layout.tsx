import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { NAV_ADMIN, NAV_EMPLOYEE, NAV_PLATFORM } from "@/lib/constants";
import { logAuthEvent } from "@/lib/auth-logger";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id || !session.user.role) {
    logAuthEvent("layout.redirect.no_session", {
      hasSession: !!session,
      hasUser: !!session?.user,
    });
    redirect("/login");
  }

  if (session.user.mustChangePassword) redirect("/account/password");
  const isAdmin = session.user.role === "ADMIN";
  const navItems = session.user.role === "PLATFORM_ADMIN" ? NAV_PLATFORM : isAdmin ? NAV_ADMIN : NAV_EMPLOYEE;

  return (
    <div className="min-h-dvh bg-muted/30">
      <Sidebar
        navItems={navItems}
        role={session.user.role}
        userName={session.user.name}
      />
      <main className="transition-[padding] duration-200 md:pl-[var(--sidebar-width,16rem)]">
        <div
          className={[
            "safe-x mx-auto w-full",
            "max-w-[var(--content-max-width,80rem)]",
            "pl-[calc(var(--page-padding-x)+var(--content-inset-start,0px))]",
            "pr-[var(--page-padding-x)]",
            "pb-[var(--page-padding-y,2rem)]",
            /* Mobile: fixed toolbar, device safe area, then the content gap. */
            "pt-[calc(3.5rem+env(safe-area-inset-top,0px)+0.5rem)]",
            /* Tablet+ */
            "md:pt-5",
            "lg:pt-6",
            "xl:pt-5",
            "2xl:pt-8",
          ].join(" ")}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
