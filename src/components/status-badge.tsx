import { STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import type { TimeEntryStatus } from "@/generated/prisma/client";

const variantMap: Record<TimeEntryStatus, "warning" | "success" | "destructive"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};

export function StatusBadge({ status }: { status: TimeEntryStatus }) {
  return <Badge variant={variantMap[status]}>{STATUS_LABELS[status]}</Badge>;
}
