"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, type ChangePasswordInput } from "@chronostek/contracts";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });
  async function submit(values: ChangePasswordInput) {
    setError(undefined);
    const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
    const body = (await response.json()) as { detail?: string; title?: string };
    if (!response.ok) return setError(body.detail ?? body.title ?? "Não foi possível alterar a senha.");
    router.replace("/dashboard"); router.refresh();
  }
  return <form onSubmit={handleSubmit(submit)} className="space-y-4">
    {[["currentPassword", "Senha atual"], ["newPassword", "Nova senha"], ["confirmation", "Confirme a nova senha"]].map(([name, label]) => <div key={name} className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} type="password" autoComplete={name === "currentPassword" ? "current-password" : "new-password"} {...register(name as keyof ChangePasswordInput)} />{errors[name as keyof ChangePasswordInput] && <p className="text-xs text-red-400">{errors[name as keyof ChangePasswordInput]?.message}</p>}</div>)}
    {error && <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
    <Button className="w-full" disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}Definir nova senha</Button>
  </form>;
}
