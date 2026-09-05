"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Company = { id: string; name: string; status: "ACTIVE" | "INACTIVE"; users: { id: string; name: string; email: string }[] };
export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/platform/companies");
      if (!res.ok) throw new Error("Firmen konnten nicht geladen werden");
      setCompanies(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Verbindungsfehler"); }
  }, []);
  useEffect(() => {
    // State updates happen after the awaited network response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  async function perform(url: string, method: string, data: object) {
    setBusy(true); setError(""); setLink("");
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Aktion fehlgeschlagen");
      if (body.activationUrl) setLink(body.activationUrl);
      await load();
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Verbindungsfehler"); return false; }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Firmenverwaltung</h1><p className="text-muted-foreground">Firmen und deren Administratoren verwalten.</p></div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {link && <Card><CardHeader><CardTitle>Aktivierungslink erstellt</CardTitle></CardHeader><CardContent className="space-y-3">
      <p>Gültig für 72 Stunden, einmal verwendbar. Übermitteln Sie diesen Link sicher an den Firmenadministrator.</p>
      <Input aria-label="Aktivierungslink" readOnly value={link} onFocus={e => e.currentTarget.select()} />
      <Button onClick={() => setLink("")}>Schließen</Button>
    </CardContent></Card>}
    <Card><CardHeader><CardTitle>Firma anlegen</CardTitle></CardHeader><CardContent>
      <form className="grid gap-4 md:grid-cols-3" onSubmit={async e => {
        e.preventDefault(); const form = e.currentTarget; const data = new FormData(form);
        if (await perform("/api/platform/companies", "POST", Object.fromEntries(data))) form.reset();
      }}>
        <div className="space-y-2"><Label htmlFor="company">Firmenname</Label><Input id="company" name="name" required minLength={2} maxLength={150} /></div>
        <div className="space-y-2"><Label htmlFor="admin">Name des Administrators</Label><Input id="admin" name="adminName" required minLength={2} maxLength={150} /></div>
        <div className="space-y-2"><Label htmlFor="email">E-Mail des Administrators</Label><Input id="email" name="email" type="email" required /></div>
        <Button disabled={busy} type="submit">Firma und Zugang anlegen</Button>
      </form>
    </CardContent></Card>
    {companies.map(company => <Card key={company.id}><CardHeader><CardTitle>{company.name}</CardTitle></CardHeader><CardContent className="space-y-4">
      <p>{company.status === "ACTIVE" ? "Aktiv" : "Gesperrt"}</p>
      {company.users.map(admin => <div key={admin.id} className="flex flex-wrap items-center justify-between gap-3">
        <p>{admin.name} · {admin.email}</p>
        <Button variant="outline" disabled={busy || company.status !== "ACTIVE"} onClick={() => {
          const reason = window.prompt("Grund für den neuen Zugangslink (mindestens 10 Zeichen):");
          if (reason) void perform(`/api/platform/companies/${company.id}/invite`, "POST", { userId: admin.id, reason });
        }}>Neuer Zugangslink</Button>
      </div>)}
      {company.status === "ACTIVE" && <form className="flex flex-wrap items-end gap-3" onSubmit={async e => {
        e.preventDefault(); const form = e.currentTarget;
        if (await perform(`/api/platform/companies/${company.id}/invite`, "POST", Object.fromEntries(new FormData(form)))) form.reset();
      }}>
        <div className="space-y-2"><Label htmlFor={`admin-${company.id}`}>Weiterer Administrator</Label><Input id={`admin-${company.id}`} name="adminName" required minLength={2} maxLength={150} /></div>
        <div className="space-y-2"><Label htmlFor={`email-${company.id}`}>E-Mail</Label><Input id={`email-${company.id}`} name="email" type="email" required /></div>
        <Button disabled={busy} type="submit" variant="outline">Admin-Zugang anlegen</Button>
      </form>}
      <Button variant="outline" disabled={busy} onClick={() => {
        if (company.status === "ACTIVE" && !window.confirm(`Zugang für alle Benutzer von ${company.name} sperren?`)) return;
        void perform(`/api/platform/companies/${company.id}`, "PATCH", { status: company.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
      }}>{company.status === "ACTIVE" ? "Firma sperren" : "Firma freigeben"}</Button>
    </CardContent></Card>)}
    {!companies.length && <p className="text-muted-foreground">Noch keine Firmen angelegt.</p>}
  </div>;
}
