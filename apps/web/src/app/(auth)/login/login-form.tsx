"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@chronostek/contracts";
import { LoaderCircle, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setError(undefined);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = (await response.json()) as { forcePasswordChange?: boolean; detail?: string; title?: string };
    if (!response.ok) return setError(body.detail ?? body.title ?? "Não foi possível entrar.");
    router.replace(body.forcePasswordChange ? "/alterar-senha" : "/dashboard");
    router.refresh();
  }

  const inputClassName = "h-10 rounded-md border-[#302a3d] bg-[#0b0a13] px-3 text-[13px] text-white shadow-none placeholder:text-[#5d5769] focus-visible:border-[#9f6cff] focus-visible:ring-1 focus-visible:ring-[#9f6cff]/50";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-[11px] font-medium text-white">E-mail</Label>
        <Input id="email" type="email" autoComplete="username" placeholder="voce@empresa.com.br" className={inputClassName} {...register("email")} />
        {errors.email && <p className="text-[11px] text-red-400">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-[11px] font-medium text-white">Senha</Label>
        <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" className={inputClassName} {...register("password")} />
        {errors.password && <p className="text-[11px] text-red-400">{errors.password.message}</p>}
      </div>
      {error && <div role="alert" className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">{error}</div>}
      <Button type="submit" className="h-10 w-full gap-2 bg-[#9d60ef] text-xs font-medium text-[#100b18] shadow-none hover:bg-[#ad75f5]" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
        Entrar
      </Button>
    </form>
  );
}
