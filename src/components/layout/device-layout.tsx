import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Vertical rhythm tuned per device tier */
export function PageSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        /* Tighter gap directly under PageHeader band, then normal section rhythm */
        "flex flex-col gap-5",
        "md:gap-5",
        "lg:gap-6",
        "xl:gap-5",
        "2xl:gap-8",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Dashboard KPI cards:
 * mobile 1 col → tablet 2 col → laptop 3 col (balanced) → large desktop 3–4 col
 */
export function StatGrid({
  children,
  columns = 3,
  className,
}: {
  children: ReactNode;
  columns?: 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3",
        "md:grid-cols-2 md:gap-3.5",
        columns === 4
          ? "lg:grid-cols-2 xl:grid-cols-4 xl:gap-4 2xl:gap-5"
          : "lg:grid-cols-3 lg:gap-3.5 xl:grid-cols-3 xl:gap-4 2xl:gap-5",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Two-column sections with laptop-balanced gaps */
export function SplitGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4",
        "md:grid-cols-2 md:gap-4",
        "xl:gap-4",
        "2xl:gap-6",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Filter/toolbar panels — compact on laptop, spacious on large desktop */
export function FilterPanel({
  children,
  title,
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card shadow-sm",
        "p-4 space-y-4",
        "md:p-4 md:space-y-4",
        "xl:p-4 xl:space-y-3",
        "2xl:p-6 2xl:space-y-5",
        className
      )}
    >
      {title && (
        <p className="text-sm font-semibold tracking-tight text-foreground xl:text-sm 2xl:text-base">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

/** Horizontal filter row — aligns controls on laptop screens */
export function FilterGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4",
        "md:grid-cols-2 md:gap-4 md:items-end",
        "xl:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] xl:gap-3",
        "2xl:gap-4",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Form field grid — avoids excessively wide inputs on laptop */
export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4",
        "md:grid-cols-2 md:gap-4",
        "xl:max-w-3xl xl:gap-3",
        "2xl:max-w-4xl 2xl:gap-4",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Card list item — simplified on mobile, detailed on desktop */
export function EntryListItem({
  title,
  subtitle,
  meta,
  className,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border p-3 md:p-4 xl:p-3.5 2xl:p-4", className)}>
      <p className="font-medium text-sm md:text-base xl:text-sm 2xl:text-base">{title}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground md:text-sm xl:text-xs 2xl:text-sm">
          {subtitle}
        </p>
      )}
      {meta && <div className="mt-2 xl:hidden 2xl:hidden">{meta}</div>}
    </div>
  );
}

export function MobileOnly({ children }: { children: ReactNode }) {
  return <div className="md:hidden">{children}</div>;
}

export function TabletUp({ children }: { children: ReactNode }) {
  return <div className="hidden md:block">{children}</div>;
}

export function LaptopUp({ children }: { children: ReactNode }) {
  return <div className="hidden xl:block 2xl:hidden">{children}</div>;
}

export function LargeDesktopOnly({ children }: { children: ReactNode }) {
  return <div className="hidden 2xl:block">{children}</div>;
}
