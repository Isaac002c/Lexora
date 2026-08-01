import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandWordmark } from "@/components/brand-wordmark";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/server-api";

export default async function RecoverAccessPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <ThemeProvider userId="public"><main className="grid min-h-screen place-items-center bg-background p-5"><div className="absolute right-4 top-4"><ThemeToggle /></div><section className="w-full max-w-lg rounded-lg border bg-card p-7 shadow-sm sm:p-9"><BrandWordmark className="mb-8 [&_p:first-child]:text-foreground [&_p:last-child]:text-muted-foreground" /><span className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary"><KeyRound className="h-5 w-5" /></span><h1 className="mt-5 text-2xl font-semibold">Recuperar acesso</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Para proteger os dados do escritório, a redefinição é feita por um administrador autorizado. Solicite uma senha temporária ao responsável pelo Lexora em sua organização; todas as sessões anteriores serão revogadas.</p><div className="mt-6 rounded-md border border-info/25 bg-info/10 p-4 text-sm"><p className="font-medium">Não recebeu as orientações?</p><p className="mt-1 text-muted-foreground">Confirme com a administração se seu usuário está ativo e associado à filial correta.</p></div><Button asChild variant="outline" className="mt-7"><Link href="/login"><ArrowLeft className="mr-2 h-4 w-4" />Voltar ao login</Link></Button></section></main></ThemeProvider>;
}
