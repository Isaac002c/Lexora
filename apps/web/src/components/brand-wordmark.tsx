import { cn } from "@/lib/utils";

export function BrandWordmark({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) return <div className={cn("flex h-full items-center justify-center", className)}><span className="text-[10px] font-semibold tracking-[0.2em] text-white [writing-mode:vertical-rl]">LEXORA</span><span className="sr-only">Lexora, um produto Telun.</span></div>;
  return <div className={cn("min-w-0", className)}><p className="font-semibold tracking-[0.22em] text-white">LEXORA</p><p className="mt-0.5 truncate text-[10px] tracking-wide text-slate-500">um produto Telun.</p></div>;
}

