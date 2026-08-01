import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { BrandWordmark } from "@/components/brand-wordmark";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/server-api";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <ThemeProvider userId="public"><main className="grid min-h-screen bg-background lg:grid-cols-[1.08fr_0.92fr]">
    <section className="relative hidden overflow-hidden border-r border-white/10 bg-telun-cosmico p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
      <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full border border-telun-lilas/15" /><div className="pointer-events-none absolute -left-8 top-1/3 h-48 w-48 rounded-full border border-telun-dourado/10" /><div className="pointer-events-none absolute bottom-12 right-12 h-24 w-24 border-b border-r border-telun-cobre/20" />
      <BrandWordmark />
      <div className="relative max-w-2xl"><p className="text-xs font-medium uppercase tracking-[0.22em] text-telun-dourado">Direção, clareza e precisão</p><h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">A operação jurídica inteira, conduzida com contexto.</h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-400">Processos, prazos, atendimentos e gestão em um ambiente seguro, auditável e organizado para a rotina real do escritório.</p><div className="mt-10 grid gap-4 text-sm text-slate-300 sm:grid-cols-2"><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-telun-lilas" />Isolamento por escritório</p><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-telun-lilas" />Trilha de auditoria</p><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-telun-lilas" />Fluxos por departamento</p><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-telun-lilas" />Dados protegidos</p></div></div>
      <p className="text-xs text-slate-600">Lexora, um produto Telun.</p>
    </section>
    <section className="relative flex min-h-screen items-center justify-center px-5 py-12 sm:px-10 lg:px-14">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-md"><div className="mb-10 lg:hidden"><BrandWordmark className="[&_p:first-child]:text-foreground [&_p:last-child]:text-muted-foreground" /></div><p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Ambiente seguro</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Bem-vindo ao Lexora</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Use seu e-mail profissional e sua senha. O escritório é identificado com segurança pelo sistema.</p><div className="mt-8"><LoginForm /></div><div className="mt-7 flex items-center justify-between gap-4 border-t pt-5 text-xs text-muted-foreground"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Sessão protegida</span><a href="/recuperar-acesso" className="flex items-center gap-1 font-medium text-primary hover:underline">Recuperar acesso <ArrowRight className="h-3 w-3" /></a></div></div>
    </section>
  </main></ThemeProvider>;
}
