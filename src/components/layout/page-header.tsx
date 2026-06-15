import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Hide inline action on mobile when a FAB is used elsewhere */
  hideMobileAction?: boolean;
  className?: string;
}

/**
 * Centered page header band used on every dashboard view.
 * Title, subtitle, and actions are horizontally centered in the content area.
 */
export function PageHeader({
  title,
  description,
  action,
  hideMobileAction = false,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "-ml-[calc(var(--page-padding-x)+var(--content-inset-start,0px))]",
        "-mr-[var(--page-padding-x)]",
        "border-b border-border/60",
        "bg-background/50 text-center backdrop-blur-sm",
        "dark:border-border/40 dark:bg-background/30",
        "pl-[calc(var(--page-padding-x)+var(--content-inset-start,0px))]",
        "pr-[var(--page-padding-x)]",
        "pt-[var(--header-padding-y)]",
        "pb-[calc(var(--header-padding-y)+0.25rem)]",
        "max-md:pt-3",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 md:gap-4 2xl:max-w-4xl 2xl:gap-5">
        <div className="w-full">
          <h1
            className={cn(
              "text-xl font-bold tracking-tight text-foreground",
              "md:text-2xl",
              "xl:text-[1.625rem] xl:leading-tight",
              "2xl:text-3xl 2xl:tracking-tight"
            )}
          >
            {title}
          </h1>
          {description && (
            <p
              className={cn(
                "mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground",
                "md:mt-2.5",
                "xl:mt-2 xl:text-[13px] xl:leading-relaxed",
                "2xl:mt-2.5 2xl:text-base"
              )}
            >
              {description}
            </p>
          )}
        </div>
        {action && (
          <div
            className={cn(
              "flex w-full justify-center",
              "[&_button]:w-full sm:[&_button]:w-auto",
              hideMobileAction && "hidden md:flex"
            )}
          >
            {action}
          </div>
        )}
      </div>
    </header>
  );
}

/** Loading / error placeholder with header-aligned spacing */
export function PageStatusMessage({
  children,
  variant = "muted",
  className,
}: {
  children: ReactNode;
  variant?: "muted" | "error";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-8 text-center text-sm",
        variant === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-border/60 bg-muted/30 text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}
