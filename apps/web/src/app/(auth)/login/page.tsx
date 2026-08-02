import { redirect } from "next/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/server-api";
import { LoginForm } from "./login-form";

function TelunSignature() {
  return (
    <div className="flex items-center gap-4" aria-label="Telun">
      <svg aria-hidden="true" viewBox="0 0 30 38" className="h-8 w-6 fill-none">
        <path d="M15 2v33" stroke="#b07cff" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M9 6c0 11.5 1.8 21 6 29" stroke="#8a5cff" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M21 6c0 11.5-1.8 21-6 29" stroke="#e565b8" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M4 11c0 10 3.4 17.5 11 24" stroke="#9566ff" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M26 11c0 10-3.4 17.5-11 24" stroke="#ff788f" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      <span className="text-[17px] font-semibold tracking-[0.34em] text-white">TELU<span className="text-[#ff8f8f]">N</span></span>
    </div>
  );
}

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <ThemeProvider userId="public">
      <main className="grid min-h-[100svh] bg-[#09090f] text-white lg:grid-cols-2">
        <section className="relative hidden min-h-[100svh] overflow-hidden border-r border-white/[0.035] bg-[radial-gradient(circle_at_78%_18%,rgba(84,44,129,0.24),transparent_44%),linear-gradient(140deg,#08080f_0%,#0d0a17_100%)] px-10 py-9 lg:flex lg:flex-col xl:px-12">
          <div className="relative z-10"><TelunSignature /></div>

          <div className="relative z-10 my-auto max-w-[510px] pb-10">
            <h1 className="text-[30px] font-semibold leading-[1.2] tracking-[-0.035em] text-white xl:text-[32px]">
              Tecnologia com <span className="bg-gradient-to-r from-[#9b6cff] to-[#e276aa] bg-clip-text text-transparent">propósito.</span><br />
              Luz para conectar o futuro.
            </h1>
            <p className="mt-4 max-w-[455px] text-[13px] leading-[1.65] text-[#cbc6dc]">
              Processos, prazos, atendimentos e gestão — tudo em um só lugar, com dados reais e visão em tempo real.
            </p>
            <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.28em] text-[#777187]">
              Propósito · direção · evolução
            </p>
          </div>

          <p className="relative z-10 text-[11px] text-[#706b7b]">© 2026 Telun · Lexora</p>
        </section>

        <section className="relative flex min-h-[100svh] items-center justify-center bg-[#09090f] px-6 py-14 sm:px-10">
          <div className="absolute right-0 top-14 [&_button]:rounded-l-md [&_button]:rounded-r-none [&_button]:border [&_button]:border-r-0 [&_button]:border-white/10 [&_button]:bg-white/[0.06] [&_button]:text-[#b883ff]">
            <ThemeToggle />
          </div>

          <div className="w-full max-w-[320px]">
            <div className="mb-9 lg:hidden"><TelunSignature /></div>
            <h2 className="text-lg font-semibold tracking-[-0.025em] text-white">Acessar o sistema</h2>
            <p className="mt-1.5 text-xs text-[#898397]">Entre com suas credenciais para continuar.</p>
            <div className="mt-7"><LoginForm /></div>
            <a href="/recuperar-acesso" className="mx-auto mt-5 block w-fit text-[11px] text-[#827b91] transition-colors hover:text-[#b883ff]">
              Esqueci minha senha
            </a>
          </div>

          <p className="absolute bottom-6 left-0 right-0 text-center text-[10px] text-[#5f596b] lg:hidden">Lexora, um produto Telun.</p>
        </section>
      </main>
    </ThemeProvider>
  );
}
