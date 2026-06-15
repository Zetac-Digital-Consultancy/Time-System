import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DataListCard({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm",
        onClick && "cursor-pointer active:bg-muted/50",
        className
      )}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

export function DataListRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 py-1.5 text-sm", className)}>
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function DataListActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mt-3 flex items-center justify-end gap-2 border-t border-border pt-3", className)}>
      {children}
    </div>
  );
}
