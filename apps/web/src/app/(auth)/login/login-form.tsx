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
    defaultValues: { tenantSlug: "demo-chronostek", email: "douglas@demo.chronostek.com.br", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setError(undefined);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
    const body = (await response.json()) as { forcePasswordChange?: boolean; detail?: string; title?: string };
    if (!response.ok) return setError(body.detail ?? body.title ?? "Não foi possível entrar.");
    router.replace(body.forcePasswordChange ? "/alterar-senha" : "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="tenantSlug">Ambiente do escritório</Label>
        <Input id="tenantSlug" autoComplete="organization" {...register("tenantSlug")} />
        {errors.tenantSlug && <p className="text-xs text-red-400">{errors.tenantSlug.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoComplete="username" {...register("email")} />
        {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
        {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
      </div>
      {error && <div role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        Entrar com segurança
      </Button>
    </form>
  );
}
