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

export function PageHeader({
  title,
  description,
  action,
  hideMobileAction = false,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        "md:flex-row md:items-start md:justify-between md:gap-4",
        "xl:gap-4",
        "2xl:gap-6",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h1
          className={cn(
            "text-xl font-bold tracking-tight",
            "md:text-2xl",
            "lg:text-2xl",
            "xl:text-[1.625rem] xl:leading-tight",
            "2xl:text-3xl"
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              "mt-1 text-sm text-muted-foreground",
              "xl:mt-0.5 xl:text-[13px] xl:leading-snug",
              "2xl:mt-1 2xl:text-base"
            )}
          >
            {description}
          </p>
        )}
      </div>
      {action && (
        <div
          className={cn(
            "w-full shrink-0 md:w-auto",
            "[&_button]:w-full md:[&_button]:w-auto",
            hideMobileAction && "hidden md:block"
          )}
        >
          {action}
        </div>
      )}
    </div>
  );
}
