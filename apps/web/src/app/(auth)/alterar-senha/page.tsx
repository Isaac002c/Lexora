import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/server-api";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.forcePasswordChange) redirect("/dashboard");
  return <main className="grid min-h-screen place-items-center bg-navy-950 px-6"><Card className="w-full max-w-md border-white/10 bg-navy-900"><CardHeader><CardTitle>Proteja sua conta</CardTitle><CardDescription>Defina uma senha pessoal antes de continuar.</CardDescription></CardHeader><CardContent><ChangePasswordForm /></CardContent></Card></main>;
}
