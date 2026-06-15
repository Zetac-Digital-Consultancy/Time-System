import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  className?: string;
}

export function StatCard({ title, value, description, icon: Icon, className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between space-y-0",
          "pb-1.5 pt-4 md:pt-4",
          "xl:pb-1 xl:pt-3.5",
          "2xl:pb-2 2xl:pt-6"
        )}
      >
        <CardTitle className="text-xs font-medium text-muted-foreground md:text-sm xl:text-xs 2xl:text-sm">
          {title}
        </CardTitle>
        <div className="rounded-lg bg-primary/10 p-1.5 text-primary md:p-2 xl:p-1.5 2xl:p-2.5">
          <Icon className="h-4 w-4 xl:h-3.5 xl:w-3.5 2xl:h-5 2xl:w-5" />
        </div>
      </CardHeader>
      <CardContent className={cn("pb-4 md:pb-4", "xl:pb-3.5", "2xl:pb-6")}>
        <div className="text-xl font-bold tracking-tight md:text-2xl xl:text-2xl 2xl:text-3xl">
          {value}
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground md:text-sm xl:text-xs 2xl:text-sm">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
