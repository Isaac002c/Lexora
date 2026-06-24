import { Scale, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/server-api";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-navy-950 px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(6,182,212,0.16),transparent_35%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-400/30 bg-cyan-400/10"><Scale className="h-5 w-5 text-cyan-400" /></div>
          <div><p className="font-semibold tracking-widest text-white">LEXORA</p><p className="text-xs text-slate-500">Gestão Jurídica Inteligente</p></div>
        </div>
        <Card className="border-white/10 bg-navy-900/90 shadow-2xl backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Bem-vindo</CardTitle>
            <CardDescription>Acesse o ambiente seguro do seu escritório.</CardDescription>
          </CardHeader>
          <CardContent><LoginForm /></CardContent>
        </Card>
        <p className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5" /> Sessão protegida e operações auditadas</p>
      </div>
    </main>
  );
}
