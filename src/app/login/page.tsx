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
import { dashboardPath } from "@/lib/access-policy";
import { ThemeToggle } from "@/components/theme-toggle";



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
      otp: data.otp,
      redirect: false,
    });

    if (result?.error) {
      setError("Ungültige Anmeldedaten oder Konto deaktiviert.");
      return;
    }

    const session = await getSession();
    const target = session?.user?.mustChangePassword ? "/account/password" : dashboardPath(session?.user?.role);

    // Full navigation ensures Safari applies the session cookie before loading protected routes
    window.location.assign(target);
  }

  return (
    <div className="safe-top safe-bottom safe-x flex min-h-dvh items-center justify-center md:p-4 md:bg-gradient-to-br md:from-slate-100 md:to-slate-200 md:dark:from-slate-950 md:dark:to-slate-900">
      <div
        className="absolute right-4"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
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

            <div className="space-y-2"><Label htmlFor="otp">Authenticator-Code (nur Plattform-Admins)</Label><Input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} {...register("otp")} /></div>

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

          <p className="mt-6 text-sm text-muted-foreground">Passwort vergessen? Wenden Sie sich an Ihren Firmenadministrator. Firmenadministratoren wenden sich an das ZeitTrack-Team.</p>
        </CardContent>
      </Card>
    </div>
  );
}
