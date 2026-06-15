"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSection } from "@/components/layout/device-layout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataListCard, DataListRow } from "@/components/ui/data-list-card";
import { formatDateTimeDE } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string | null;
  createdAt: string;
  admin: { name: string; email: string };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetch("/api/audit-logs")
      .then((r) => r.json())
      .then(setLogs);
  }, []);

  return (
    <PageSection>
      <PageHeader
        title="Audit-Protokoll"
        description="Protokoll aller Administrator-Aktionen"
      />

      <div className="space-y-3 md:hidden">
        {logs.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Keine Einträge im Audit-Protokoll</p>
        ) : (
          logs.map((log) => (
            <DataListCard key={log.id}>
              <DataListRow label="Zeitpunkt" value={formatDateTimeDE(log.createdAt)} />
              <DataListRow label="Administrator" value={log.admin.name} />
              <DataListRow
                label="Aktion"
                value={
                  <span className="rounded bg-muted px-2 py-1 font-mono text-xs">{log.action}</span>
                }
              />
              <DataListRow label="Entität" value={`${log.entityType} (${log.entityId})`} />
              {log.details && <DataListRow label="Details" value={log.details} />}
            </DataListCard>
          ))
        )}
      </div>

      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zeitpunkt</TableHead>
                <TableHead>Administrator</TableHead>
                <TableHead>Aktion</TableHead>
                <TableHead>Entität</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTimeDE(log.createdAt)}
                  </TableCell>
                  <TableCell>{log.admin.name}</TableCell>
                  <TableCell>
                    <span className="rounded bg-muted px-2 py-1 font-mono text-xs">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.entityType}
                    <span className="block text-xs text-muted-foreground">{log.entityId}</span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{log.details ?? "–"}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Keine Einträge im Audit-Protokoll
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageSection>
  );
}
