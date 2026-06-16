"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Building2,
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Users,
  Timer,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma/client";

const iconMap = {
  LayoutDashboard,
  Users,
  Clock,
  Building2,
  FileText,
  ScrollText,
  Bell,
  Timer,
};

interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof iconMap;
}

interface SidebarProps {
  navItems: readonly NavItem[];
  role: Role;
  userName: string;
}

function resolveSidebarWidth(tabletCollapsed: boolean): string {
  if (typeof window === "undefined") return "16rem";

  const isLargeDesktop = window.matchMedia("(min-width: 1728px)").matches;
  const isLaptop = window.matchMedia("(min-width: 1280px)").matches;
  const isSmallLaptop = window.matchMedia("(min-width: 1024px)").matches;
  const isTablet = window.matchMedia("(min-width: 768px)").matches;

  if (isLargeDesktop) return "16rem";
  if (isLaptop) return "13.5rem";
  if (isSmallLaptop) return "15rem";
  if (isTablet) return tabletCollapsed ? "4.5rem" : "16rem";
  return "0px";
}

export function Sidebar({ navItems, role, userName }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tabletCollapsed, setTabletCollapsed] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  useEffect(() => {
    const updateSidebarWidth = () => {
      document.documentElement.style.setProperty(
        "--sidebar-width",
        resolveSidebarWidth(tabletCollapsed)
      );
    };

    updateSidebarWidth();
    window.addEventListener("resize", updateSidebarWidth);
    return () => window.removeEventListener("resize", updateSidebarWidth);
  }, [tabletCollapsed]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setTabletCollapsed(false);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen, closeMobile]);

  const tabletCompact = tabletCollapsed;

  return (
    <>
      {/* Mobile (< 768px): top bar + slide-in drawer */}
      <header className="safe-top safe-x fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
        <Button
          variant="outline"
          size="icon"
          aria-label="Menü öffnen"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <HardHat className="h-5 w-5 shrink-0 text-primary" />
          <span className="truncate font-semibold text-sm">ZeitTrack</span>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="fixed inset-0 bg-black/50" onClick={closeMobile} aria-hidden="true" />
          <aside className="safe-top safe-bottom fixed inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col border-r border-border bg-background shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 z-10"
              aria-label="Menü schließen"
              onClick={closeMobile}
            >
              <X className="h-5 w-5" />
            </Button>
            <SidebarPanel
              navItems={navItems}
              role={role}
              userName={userName}
              variant="mobile"
              onNavigate={closeMobile}
            />
          </aside>
        </div>
      )}

      {/* Tablet: collapsible · Laptop+: tier-specific width */}
      <aside
        className={cn(
          "hidden md:fixed md:inset-y-0 md:z-30 md:flex md:flex-col border-r border-border bg-background transition-[width] duration-200",
          tabletCompact ? "md:w-[4.5rem]" : "md:w-64",
          "lg:w-60",
          "xl:w-[13.5rem]",
          "2xl:w-64"
        )}
      >
        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <SidebarPanel
            navItems={navItems}
            role={role}
            userName={userName}
            variant={tabletCompact ? "tablet-compact" : "tablet"}
            onNavigate={closeMobile}
          />
          <Button
            variant="outline"
            size="icon"
            className="absolute -right-3 top-20 z-10 hidden h-7 w-7 rounded-full shadow-sm md:flex lg:hidden"
            aria-label={tabletCompact ? "Seitenleiste erweitern" : "Seitenleiste einklappen"}
            onClick={() => setTabletCollapsed((v) => !v)}
          >
            {tabletCompact ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </aside>
    </>
  );
}

type SidebarVariant = "mobile" | "tablet" | "tablet-compact" | "desktop";

function SidebarPanel({
  navItems,
  role,
  userName,
  variant,
  onNavigate,
}: {
  navItems: readonly NavItem[];
  role: Role;
  userName: string;
  variant: SidebarVariant;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const compact = variant === "tablet-compact";

  return (
    <div className="flex flex-1 flex-col">
      <div
        className={cn(
          "flex items-center gap-2.5 border-b border-border px-3 py-4",
          "lg:px-3.5 lg:py-4",
          "xl:gap-2 xl:px-3 xl:py-3.5",
          "2xl:gap-3 2xl:px-4 2xl:py-5",
          compact && "justify-center px-2 lg:justify-start lg:px-3"
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground 2xl:h-10 2xl:w-10">
          <HardHat className="h-4 w-4 2xl:h-5 2xl:w-5" />
        </div>
        <div className={cn("min-w-0", compact && "hidden lg:block")}>
          <p className="font-bold text-sm leading-tight">ZeitTrack</p>
          <p className="text-[11px] text-muted-foreground xl:text-xs 2xl:text-xs">
            {role === "ADMIN" ? "Verwaltung" : "Mitarbeiter"}
          </p>
        </div>
      </div>

      <nav
        className={cn(
          "flex-1 space-y-0.5 p-2.5",
          "lg:p-3",
          "xl:space-y-px xl:p-2.5",
          "2xl:space-y-1 2xl:p-4"
        )}
      >
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={compact ? item.label : undefined}
              className={cn(
                "relative flex items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-all",
                "min-h-11 py-2",
                "lg:min-h-9 lg:py-1.5 lg:text-[13px]",
                "xl:min-h-8 xl:gap-2 xl:px-2.5 xl:py-1.5 xl:text-[13px]",
                "2xl:min-h-9 2xl:gap-3 2xl:px-3 2xl:py-2 2xl:text-sm",
                compact && "justify-center px-2 lg:justify-start lg:px-2.5",
                isActive
                  ? cn(
                      "bg-primary text-primary-foreground shadow-sm",
                      "lg:font-semibold",
                      "xl:ring-1 xl:ring-primary/25",
                      "before:absolute before:left-0 before:top-1/2 before:hidden before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary-foreground xl:before:block"
                    )
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 xl:h-4 xl:w-4 2xl:h-4 2xl:w-4" />
              <span className={cn("truncate", compact && "hidden lg:inline")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "space-y-2.5 border-t border-border p-2.5",
          "lg:p-3",
          "xl:space-y-2 xl:p-2.5",
          "2xl:space-y-3 2xl:p-4"
        )}
      >
        <div className={cn("px-2", compact && "hidden lg:block", "xl:px-1.5", "2xl:px-3")}>
          <p className="truncate text-sm font-medium leading-tight xl:text-[13px] 2xl:text-sm">
            {userName}
          </p>
          <p className="text-[11px] text-muted-foreground xl:text-xs">
            {role === "ADMIN" ? "Administrator" : "Mitarbeiter"}
          </p>
        </div>
        <div className={cn("flex items-center gap-1.5", compact && "flex-col lg:flex-row", "2xl:gap-2")}>
          <ThemeToggle />
          <Button
            variant="outline"
            size={compact ? "icon" : "sm"}
            className={cn(
              !compact && "flex-1",
              "min-h-9 xl:min-h-8 xl:text-xs",
              "2xl:min-h-9 2xl:text-sm"
            )}
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Abmelden"
          >
            <LogOut className="h-3.5 w-3.5 2xl:h-4 2xl:w-4" />
            <span className={cn(compact && "hidden lg:inline")}>Abmelden</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
