"use client";
import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PasswordForm({ activation = false }: { activation?: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return <main className="mx-auto max-w-md p-5 py-16"><Card><CardHeader><CardTitle>{activation ? "Zugang aktivieren" : "Passwort ändern"}</CardTitle></CardHeader><CardContent>
    {done ? <div className="space-y-4"><p>Passwort gespeichert. Bitte melden Sie sich neu an.</p><Link href="/login">Zur Anmeldung</Link></div> :
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault(); setError("");
      const data = new FormData(e.currentTarget);
      if (data.get("password") !== data.get("confirm")) { setError("Die Passwörter stimmen nicht überein"); return; }
      setBusy(true);
      try {
        const res = await fetch(activation ? "/api/account/activate" : "/api/account/password", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: data.get("password"), currentPassword: data.get("currentPassword"), token: window.location.hash.slice(1) }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Passwort konnte nicht gespeichert werden");
        if (activation) window.history.replaceState(null, "", "/activate");
        else await signOut({ redirect: false });
        setDone(true);
      } catch (e) { setError(e instanceof Error ? e.message : "Verbindungsfehler"); }
      finally { setBusy(false); }
    }}>
      {!activation && <div className="space-y-2"><Label htmlFor="currentPassword">Aktuelles Passwort</Label><Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required /></div>}
      <div className="space-y-2"><Label htmlFor="password">Neues Passwort</Label><Input id="password" name="password" type="password" autoComplete="new-password" minLength={15} required /><p className="text-xs text-muted-foreground">Mindestens 15 Zeichen, maximal 72 UTF-8-Bytes.</p></div>
      <div className="space-y-2"><Label htmlFor="confirm">Passwort wiederholen</Label><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required /></div>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <Button type="submit" disabled={busy}>Passwort speichern</Button>
      {!activation && <Button type="button" variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>Abmelden</Button>}
    </form>}
  </CardContent></Card></main>;
}
