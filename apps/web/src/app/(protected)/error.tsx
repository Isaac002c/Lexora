"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return <div className="grid min-h-96 place-items-center text-center"><div><h2 className="text-xl font-semibold">Algo não saiu como esperado</h2><p className="mt-2 text-sm text-muted-foreground">{error.message}</p><Button className="mt-5" onClick={reset}>Tentar novamente</Button></div></div>;
}
