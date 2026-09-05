"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSection } from "@/components/layout/device-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataListActions, DataListCard, DataListRow } from "@/components/ui/data-list-card";
import { baustelleSchema, type BaustelleInput } from "@/lib/validations";
import { formatDateDE } from "@/lib/utils";

interface Baustelle {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  createdAt: string;
  _count: { timeEntries: number };
}

export default function BaustellenPage() {
  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Baustelle | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BaustelleInput>({
    resolver: zodResolver(baustelleSchema),
  });

  function fetchBaustellen() {
    fetch("/api/baustellen")
      .then((r) => r.json())
      .then(setBaustellen);
  }

  useEffect(() => {
    fetchBaustellen();
  }, []);

  function openEdit(item: Baustelle) {
    setEditItem(item);
    reset({ name: item.name, address: item.address ?? "", description: item.description ?? "" });
    setOpen(true);
  }

  async function onSubmit(data: BaustelleInput) {
    const url = editItem ? `/api/baustellen/${editItem.id}` : "/api/baustellen";
    const method = editItem ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      reset();
      setOpen(false);
      setEditItem(null);
      fetchBaustellen();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Baustelle wirklich löschen?")) return;
    await fetch(`/api/baustellen/${id}`, { method: "DELETE" });
    fetchBaustellen();
  }

  const formDialog = (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setEditItem(null);
      }}
    >
      <DialogTrigger asChild>
        <Button onClick={() => { setEditItem(null); reset(); }}>
          <Plus className="h-4 w-4" />
          Neue Baustelle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editItem ? "Baustelle bearbeiten" : "Neue Baustelle"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Adresse</Label>
            <Input {...register("address")} />
          </div>
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <Textarea {...register("description")} />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <PageSection>
      <PageHeader
        title="Baustellen"
        description="Baustellen und Projekte verwalten"
        action={formDialog}
      />

      <div className="space-y-3 md:hidden">
        {baustellen.map((b) => (
          <DataListCard key={b.id}>
            <p className="mb-2 font-semibold">{b.name}</p>
            <DataListRow label="Adresse" value={b.address ?? "–"} />
            <DataListRow label="Einträge" value={b._count.timeEntries} />
            <DataListRow label="Erstellt" value={formatDateDE(b.createdAt)} />
            <DataListActions>
              <Button size="icon" variant="outline" onClick={() => openEdit(b)} aria-label="Bearbeiten">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => handleDelete(b.id)} aria-label="Löschen">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </DataListActions>
          </DataListCard>
        ))}
      </div>

      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Einträge</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baustellen.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.address ?? "–"}</TableCell>
                  <TableCell>{b._count.timeEntries}</TableCell>
                  <TableCell>{formatDateDE(b.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(b.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageSection>
  );
}
