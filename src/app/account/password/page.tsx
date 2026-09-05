import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/forms/password-form";
export default async function PasswordPage() {
  if (!(await auth())) redirect("/login");
  return <PasswordForm />;
}
