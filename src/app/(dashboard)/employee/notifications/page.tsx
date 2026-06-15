"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSection } from "@/components/layout/device-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTimeDE } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then(setNotifications);
  }, []);

  async function markAsRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  return (
    <PageSection>
      <PageHeader
        title="Benachrichtigungen"
        description="Status-Updates zu Ihren Zeiteinträgen"
      />

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="mb-4 h-12 w-12 opacity-50" />
            <p>Keine Benachrichtigungen</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={notification.read ? "opacity-60" : "border-primary/30"}
            >
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between md:p-5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{notification.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTimeDE(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full min-h-11 shrink-0 md:w-auto md:min-h-0"
                    onClick={() => markAsRead(notification.id)}
                  >
                    Gelesen
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageSection>
  );
}
