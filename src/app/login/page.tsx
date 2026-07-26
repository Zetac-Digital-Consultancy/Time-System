"use client";

import { useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HardHat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { ThemeToggle } from "@/components/theme-toggle";

function getDashboardPath(role: string | undefined) {
  return role === "ADMIN" ? "/admin/dashboard" : "/employee/dashboard";
}

export default function LoginPage() {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setError("");
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Ungültige Anmeldedaten oder Konto deaktiviert.");
      return;
    }

    const session = await getSession();
    const dashboardPath = getDashboardPath(session?.user?.role);

    // Full navigation ensures Safari applies the session cookie before loading protected routes
    window.location.assign(dashboardPath);
  }

  return (
    <div className="safe-top safe-bottom safe-x flex min-h-dvh items-center justify-center md:p-4 md:bg-gradient-to-br md:from-slate-100 md:to-slate-200 md:dark:from-slate-950 md:dark:to-slate-900">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full md:max-w-md lg:max-w-lg border-0 shadow-none md:shadow-xl bg-transparent md:bg-card rounded-none md:rounded-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <HardHat className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">ZeitTrack</CardTitle>
            <CardDescription className="mt-2">
              Zeiterfassung für Bauunternehmen
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@firma.de"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full min-h-11" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Anmelden...
                </>
              ) : (
                "Anmelden"
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-lg bg-muted p-4 text-xs text-muted-foreground">
            <p className="font-medium mb-2">Demo-Zugangsdaten:</p>
            <p>Admin: admin@bauunternehmen.de / admin123</p>
            <p>Mitarbeiter: max.mueller@bauunternehmen.de / mitarbeiter123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
