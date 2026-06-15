"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataListActions, DataListCard, DataListRow } from "@/components/ui/data-list-card";
import { employeeSchema, type EmployeeInput } from "@/lib/validations";
import { formatDateDE } from "@/lib/utils";
import type { UserStatus } from "@/generated/prisma/client";

interface Employee {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  createdAt: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { status: "ACTIVE" },
  });

  function fetchEmployees() {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setEmployees);
  }

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (editEmployee) {
      reset({
        name: editEmployee.name,
        email: editEmployee.email,
        status: editEmployee.status,
        password: "",
      });
      setOpen(true);
    }
  }, [editEmployee, reset]);

  async function onSubmit(data: EmployeeInput) {
    const url = editEmployee ? `/api/users/${editEmployee.id}` : "/api/users";
    const method = editEmployee ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      reset();
      setOpen(false);
      setEditEmployee(null);
      fetchEmployees();
    }
  }

  return (
    <PageSection>
      <PageHeader
        title="Mitarbeiter"
        description="Mitarbeiterkonten verwalten"
        action={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditEmployee(null);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => { setEditEmployee(null); reset({ status: "ACTIVE" }); }}>
                <Plus className="h-4 w-4" />
                Neuer Mitarbeiter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editEmployee ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input {...register("name")} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <Input type="email" {...register("email")} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{editEmployee ? "Neues Passwort (optional)" : "Passwort"}</Label>
                  <Input type="password" {...register("password")} />
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={watch("status")}
                    onValueChange={(v) => setValue("status", v as UserStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Aktiv</SelectItem>
                      <SelectItem value="INACTIVE">Inaktiv</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-3 md:hidden">
        {employees.map((employee) => (
          <DataListCard key={employee.id}>
            <p className="mb-2 font-semibold">{employee.name}</p>
            <DataListRow label="E-Mail" value={<span className="break-all">{employee.email}</span>} />
            <DataListRow label="Erstellt" value={formatDateDE(employee.createdAt)} />
            <DataListActions>
              <Button size="icon" variant="outline" onClick={() => setEditEmployee(employee)} aria-label="Bearbeiten">
                <Pencil className="h-4 w-4" />
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
                <TableHead>E-Mail</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{formatDateDE(employee.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => setEditEmployee(employee)}>
                      <Pencil className="h-4 w-4" />
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
